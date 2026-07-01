import {
    _decorator,
    Component,
    EventTouch,
    input,
    Input,
    Node,
    Vec2,
    Vec3,
} from 'cc';
import { MeshLoader } from './MeshLoader';
import { Projectile } from './Projectile';

const { ccclass, property } = _decorator;

/** 炮塔瞄准与发射控制 */
@ccclass('CannonController')
export class CannonController extends Component {
    @property({ type: Node, tooltip: '炮口挂点' })
    muzzle: Node | null = null;

    @property({ tooltip: '水平旋转灵敏度（度/像素）' })
    yawSensitivity = 0.15;

    @property({ tooltip: '俯仰灵敏度（度/像素）' })
    pitchSensitivity = 0.08;

    @property({ tooltip: '俯仰角限制（度）' })
    pitchLimit = 15;

    @property({ tooltip: '发射冲量' })
    fireImpulse = 18;

    @property({ tooltip: '发射冷却（秒）' })
    fireCooldown = 0.3;

    private _barrel: Node | null = null;
    private _yaw = 0;
    private _pitch = 0;
    private _touching = false;
    private _touchStart = new Vec2();
    private _inputEnabled = true;
    private _cooldownLeft = 0;
    private _onFire: (() => void) | null = null;

    /** 注册发射回调（用于扣减炮弹） */
    setFireCallback(cb: () => void) {
        this._onFire = cb;
    }

    /** 是否允许输入 */
    setInputEnabled(v: boolean) {
        this._inputEnabled = v;
    }

    async initModels() {
        try {
            const bottom = await MeshLoader.instantiate('CannonBottom', this.node);
            bottom.setPosition(0, 0, 0);
        } catch (e) {
            console.warn('[CannonController] CannonBottom 加载失败', e);
        }

        try {
            this._barrel = await MeshLoader.instantiate('CannonBody', this.node);
            this._barrel.setPosition(0, 0.3, 0);
        } catch (e) {
            console.warn('[CannonController] CannonBody 加载失败', e);
        }

        if (!this.muzzle) {
            this.muzzle = new Node('Muzzle');
            this.muzzle.setParent(this._barrel ?? this.node);
            this.muzzle.setPosition(0, 0.2, 0.8);
        }
    }

    onLoad() {
        input.on(Input.EventType.TOUCH_START, this._onTouchStart, this);
        input.on(Input.EventType.TOUCH_MOVE, this._onTouchMove, this);
        input.on(Input.EventType.TOUCH_END, this._onTouchEnd, this);
        input.on(Input.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
    }

    onDestroy() {
        input.off(Input.EventType.TOUCH_START, this._onTouchStart, this);
        input.off(Input.EventType.TOUCH_MOVE, this._onTouchMove, this);
        input.off(Input.EventType.TOUCH_END, this._onTouchEnd, this);
        input.off(Input.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
    }

    update(dt: number) {
        if (this._cooldownLeft > 0) {
            this._cooldownLeft -= dt;
        }
        this._applyRotation();
    }

    private _applyRotation() {
        this.node.setRotationFromEuler(0, this._yaw, 0);
        if (this._barrel) {
            this._barrel.setRotationFromEuler(-this._pitch, 0, 0);
        }
    }

    private _onTouchStart(e: EventTouch) {
        if (!this._inputEnabled || this._cooldownLeft > 0) {
            return;
        }
        this._touching = true;
        e.getUILocation(this._touchStart);
    }

    private _onTouchMove(e: EventTouch) {
        if (!this._touching || !this._inputEnabled) {
            return;
        }
        const loc = new Vec2();
        e.getUILocation(loc);
        const dx = loc.x - this._touchStart.x;
        const dy = loc.y - this._touchStart.y;
        this._yaw += dx * this.yawSensitivity;
        this._pitch = Math.max(-this.pitchLimit, Math.min(this.pitchLimit, this._pitch - dy * this.pitchSensitivity));
        this._touchStart.set(loc);
    }

    private _asyncTouchEnd() {
        if (!this._touching || !this._inputEnabled || this._cooldownLeft > 0) {
            this._touching = false;
            return;
        }
        this._touching = false;
        this._fire();
    }

    private _onTouchEnd(_e: EventTouch) {
        this._asyncTouchEnd();
    }

    private async _fire() {
        if (!this.muzzle) {
            return;
        }
        this._cooldownLeft = this.fireCooldown;
        this._onFire?.();

        try {
            const ballNode = await MeshLoader.instantiate('CannonBall', this.node.scene);
            const muzzleWp = this.muzzle.worldPosition;
            const forward = this.muzzle.forward.clone();
            ballNode.setWorldPosition(muzzleWp.x + forward.x * 0.3, muzzleWp.y + forward.y * 0.3, muzzleWp.z + forward.z * 0.3);

            let proj = ballNode.getComponent(Projectile);
            if (!proj) {
                proj = ballNode.addComponent(Projectile);
            }
            proj.fire(forward, this.fireImpulse);
        } catch (e) {
            console.error('[CannonController] 发射失败', e);
        }
    }
}
