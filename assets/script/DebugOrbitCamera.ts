import { _decorator, Component, Vec3, input, Input, EventMouse, EventTouch } from 'cc';

const { ccclass, property } = _decorator;

/**
 * 调试用轨道相机控制器：仅用于预览调试，不属于玩法逻辑。
 * - 鼠标左键拖拽：绕目标点旋转
 * - 鼠标右键拖拽：平移目标点
 * - 鼠标滚轮 / 双指捏合：缩放距离
 * - 单指拖拽（触屏兜底）：旋转
 */
@ccclass('DebugOrbitCamera')
export class DebugOrbitCamera extends Component {
    @property({ tooltip: '旋转灵敏度（度/像素）' })
    rotateSpeed = 0.3;

    @property({ tooltip: '平移灵敏度（与距离相关的系数）' })
    panSpeed = 0.0015;

    @property({ tooltip: '缩放灵敏度' })
    zoomSpeed = 0.002;

    @property({ tooltip: '与目标点的最近距离' })
    minDistance = 1;

    @property({ tooltip: '与目标点的最远距离' })
    maxDistance = 500;

    @property({ tooltip: '俯仰角下限（度）' })
    minPitch = -85;

    @property({ tooltip: '俯仰角上限（度）' })
    maxPitch = 85;

    private _pivot = new Vec3();
    private _yaw = 0;
    private _pitch = 20;
    private _distance = 10;
    private _rotating = false;
    private _panning = false;

    /** 用外部算好的目标点/距离初始化轨道参数（一般由自动取景逻辑调用一次） */
    setup(pivot: Readonly<Vec3>, distance?: number) {
        this._pivot.set(pivot);

        const offset = new Vec3();
        Vec3.subtract(offset, this.node.worldPosition, this._pivot);
        const len = offset.length();
        this._distance = Math.max(this.minDistance, Math.min(this.maxDistance, distance ?? (len > 0.001 ? len : 10)));

        const horizontal = Math.sqrt(offset.x * offset.x + offset.z * offset.z);
        this._pitch = this._clampPitch(Math.atan2(offset.y, horizontal) * (180 / Math.PI));
        this._yaw = Math.atan2(offset.x, offset.z) * (180 / Math.PI);
        this._apply();
    }

    onLoad() {
        input.on(Input.EventType.MOUSE_DOWN, this._onMouseDown, this);
        input.on(Input.EventType.MOUSE_MOVE, this._onMouseMove, this);
        input.on(Input.EventType.MOUSE_UP, this._onMouseUp, this);
        input.on(Input.EventType.MOUSE_WHEEL, this._onMouseWheel, this);
        input.on(Input.EventType.TOUCH_START, this._onTouchStart, this);
        input.on(Input.EventType.TOUCH_MOVE, this._onTouchMove, this);
        input.on(Input.EventType.TOUCH_END, this._onTouchEnd, this);
        input.on(Input.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
    }

    onDestroy() {
        input.off(Input.EventType.MOUSE_DOWN, this._onMouseDown, this);
        input.off(Input.EventType.MOUSE_MOVE, this._onMouseMove, this);
        input.off(Input.EventType.MOUSE_UP, this._onMouseUp, this);
        input.off(Input.EventType.MOUSE_WHEEL, this._onMouseWheel, this);
        input.off(Input.EventType.TOUCH_START, this._onTouchStart, this);
        input.off(Input.EventType.TOUCH_MOVE, this._onTouchMove, this);
        input.off(Input.EventType.TOUCH_END, this._onTouchEnd, this);
        input.off(Input.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
    }

    private _onMouseDown(e: EventMouse) {
        if (e.getButton() === EventMouse.BUTTON_LEFT) {
            this._rotating = true;
        } else if (e.getButton() === EventMouse.BUTTON_RIGHT) {
            this._panning = true;
        }
    }

    private _onMouseMove(e: EventMouse) {
        if (!this._rotating && !this._panning) {
            return;
        }
        const dx = e.getDeltaX();
        const dy = e.getDeltaY();
        if (this._rotating) {
            this._rotate(dx, dy);
        } else {
            this._pan(dx, dy);
        }
    }

    private _onMouseUp(e: EventMouse) {
        if (e.getButton() === EventMouse.BUTTON_LEFT) {
            this._rotating = false;
        } else if (e.getButton() === EventMouse.BUTTON_RIGHT) {
            this._panning = false;
        }
    }

    private _onMouseWheel(e: EventMouse) {
        const delta = e.getScrollY();
        this._zoom(-delta * this.zoomSpeed);
    }

    // 触屏兜底：单指拖拽视为旋转
    private _touchId = -1;
    private _onTouchStart(e: EventTouch) {
        if (this._touchId < 0) {
            this._touchId = e.getID() ?? -1;
            this._rotating = true;
        }
    }

    private _onTouchMove(e: EventTouch) {
        if (e.getID() !== this._touchId) {
            return;
        }
        const d = e.getDelta();
        this._rotate(d.x, d.y);
    }

    private _onTouchEnd(e: EventTouch) {
        if (e.getID() === this._touchId) {
            this._touchId = -1;
            this._rotating = false;
        }
    }

    private _clampPitch(p: number): number {
        return Math.max(this.minPitch, Math.min(this.maxPitch, p));
    }

    private _rotate(dx: number, dy: number) {
        this._yaw -= dx * this.rotateSpeed;
        this._pitch = this._clampPitch(this._pitch + dy * this.rotateSpeed);
        this._apply();
    }

    private _pan(dx: number, dy: number) {
        const right = this.node.right;
        const up = this.node.up;
        const scale = this._distance * this.panSpeed;
        Vec3.scaleAndAdd(this._pivot, this._pivot, right, -dx * scale);
        Vec3.scaleAndAdd(this._pivot, this._pivot, up, dy * scale);
        this._apply();
    }

    private _zoom(delta: number) {
        this._distance = Math.max(this.minDistance, Math.min(this.maxDistance, this._distance + delta * this._distance));
        this._apply();
    }

    private _apply() {
        const yawRad = (this._yaw * Math.PI) / 180;
        const pitchRad = (this._pitch * Math.PI) / 180;
        const cosPitch = Math.cos(pitchRad);
        const pos = new Vec3(
            this._pivot.x + this._distance * cosPitch * Math.sin(yawRad),
            this._pivot.y + this._distance * Math.sin(pitchRad),
            this._pivot.z + this._distance * cosPitch * Math.cos(yawRad),
        );
        this.node.setWorldPosition(pos);
        this.node.lookAt(this._pivot);
    }
}
