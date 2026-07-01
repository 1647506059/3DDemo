import {
    _decorator,
    Component,
    Node,
    Vec3,
    input,
    Input,
    EventMouse,
    EventTouch,
} from 'cc';

const { ccclass, property } = _decorator;

/** 轨道相机：跟随目标，鼠标/触摸拖拽旋转视角 */
@ccclass('CameraFollow')
export class CameraFollow extends Component {
    @property({ type: Node, tooltip: '跟随目标（一般为 Player 节点）' })
    target: Node | null = null;

    @property({ tooltip: '跟随平滑系数，越大越快' })
    smoothSpeed = 8;

    @property({ tooltip: '与目标的距离' })
    distance = 15;

    @property({ tooltip: '注视点相对目标的高度偏移' })
    pivotHeight = 1;

    @property({ tooltip: '水平旋转灵敏度（度/像素）' })
    rotateSpeedX = 0.3;

    @property({ tooltip: '垂直旋转灵敏度（度/像素）' })
    rotateSpeedY = 0.3;

    @property({ tooltip: '俯仰角下限（度）' })
    minPitch = -10;

    @property({ tooltip: '俯仰角上限（度）' })
    maxPitch = 80;

    private _yaw = 0;
    private _pitch = 35;
    private _dragging = false;

    private _pivot = new Vec3();
    private _desiredPos = new Vec3();
    private _currentPos = new Vec3();
    private _offset = new Vec3();

    onLoad() {
        input.on(Input.EventType.MOUSE_DOWN, this._onMouseDown, this);
        input.on(Input.EventType.MOUSE_MOVE, this._onMouseMove, this);
        input.on(Input.EventType.MOUSE_UP, this._onMouseUp, this);
        input.on(Input.EventType.TOUCH_START, this._onTouchStart, this);
        input.on(Input.EventType.TOUCH_MOVE, this._onTouchMove, this);
        input.on(Input.EventType.TOUCH_END, this._onTouchEnd, this);
        input.on(Input.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
    }

    onDestroy() {
        input.off(Input.EventType.MOUSE_DOWN, this._onMouseDown, this);
        input.off(Input.EventType.MOUSE_MOVE, this._onMouseMove, this);
        input.off(Input.EventType.MOUSE_UP, this._onMouseUp, this);
        input.off(Input.EventType.TOUCH_START, this._onTouchStart, this);
        input.off(Input.EventType.TOUCH_MOVE, this._onTouchMove, this);
        input.off(Input.EventType.TOUCH_END, this._onTouchEnd, this);
        input.off(Input.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
    }

    start() {
        if (!this.target) {
            const mainNode = this.node.scene?.getChildByName('Main');
            this.target = mainNode?.getChildByName('Player')
                ?? this.node.scene?.getChildByName('Player')
                ?? null;
        }
        this._initOrbitFromCurrentTransform();
    }

    lateUpdate(deltaTime: number) {
        if (!this.target) {
            return;
        }

        this._updateDesiredPosition();
        Vec3.copy(this._currentPos, this.node.worldPosition);
        const t = Math.min(1, this.smoothSpeed * deltaTime);
        Vec3.lerp(this._currentPos, this._currentPos, this._desiredPos, t);
        this.node.setWorldPosition(this._currentPos);
        this.node.lookAt(this._pivot);
    }

    /** 从当前相机位置反算初始 yaw/pitch/distance */
    private _initOrbitFromCurrentTransform() {
        if (!this.target) {
            return;
        }

        this._getPivot(this._pivot);
        Vec3.subtract(this._offset, this.node.worldPosition, this._pivot);
        const len = this._offset.length();
        if (len > 0.001) {
            this.distance = len;
        }

        const horizontal = Math.sqrt(this._offset.x * this._offset.x + this._offset.z * this._offset.z);
        this._pitch = Math.atan2(this._offset.y, horizontal) * (180 / Math.PI);
        this._yaw = Math.atan2(this._offset.x, this._offset.z) * (180 / Math.PI);
        this._pitch = this._clampPitch(this._pitch);
    }

    private _getPivot(out: Vec3) {
        const targetPos = this.target!.worldPosition;
        out.set(targetPos.x, targetPos.y + this.pivotHeight, targetPos.z);
    }

    private _updateDesiredPosition() {
        this._getPivot(this._pivot);

        const yawRad = this._yaw * (Math.PI / 180);
        const pitchRad = this._pitch * (Math.PI / 180);
        const cosPitch = Math.cos(pitchRad);
        const sinPitch = Math.sin(pitchRad);

        this._desiredPos.set(
            this._pivot.x + this.distance * cosPitch * Math.sin(yawRad),
            this._pivot.y + this.distance * sinPitch,
            this._pivot.z + this.distance * cosPitch * Math.cos(yawRad),
        );
    }

    private _applyRotation(deltaX: number, deltaY: number) {
        this._yaw -= deltaX * this.rotateSpeedX;
        this._pitch = this._clampPitch(this._pitch - deltaY * this.rotateSpeedY);
    }

    private _clampPitch(pitch: number) {
        return Math.max(this.minPitch, Math.min(this.maxPitch, pitch));
    }

    private _onMouseDown(event: EventMouse) {
        // 左键拖拽旋转视角
        if (event.getButton() === EventMouse.BUTTON_LEFT) {
            this._dragging = true;
        }
    }

    private _onMouseMove(event: EventMouse) {
        if (!this._dragging) {
            return;
        }
        this._applyRotation(event.getDeltaX(), event.getDeltaY());
    }

    private _onMouseUp(event: EventMouse) {
        if (event.getButton() === EventMouse.BUTTON_LEFT) {
            this._dragging = false;
        }
    }

    private _onTouchStart() {
        this._dragging = true;
    }

    private _onTouchMove(event: EventTouch) {
        if (!this._dragging) {
            return;
        }
        const delta = event.getDelta();
        this._applyRotation(delta.x, delta.y);
    }

    private _onTouchEnd() {
        this._dragging = false;
    }
}
