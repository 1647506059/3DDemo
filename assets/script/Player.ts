import {
    _decorator,
    Component,
    Vec3,
    input,
    Input,
    EventKeyboard,
    KeyCode,
    CapsuleCharacterController,
    Camera,
    Quat,
} from 'cc';
import { PLAYER_FEET_LOCAL_Y } from './WalkableGround';

const { ccclass, property } = _decorator;

/** 玩家移动与跳跃控制 */
@ccclass('Player')
export class Player extends Component {
    @property({ tooltip: '水平移动速度' })
    moveSpeed = 5;

    @property({ tooltip: '跳跃初速度' })
    jumpSpeed = 6;

    @property({ tooltip: '重力加速度' })
    gravity = -20;

    @property({ tooltip: '用于计算移动方向的相机（留空则自动查找主相机）' })
    mainCamera: Camera | null = null;

    private _controller: CapsuleCharacterController | null = null;
    private _verticalVelocity = 0;
    private _jumpRequested = false;

    private _moveInput = new Vec3();
    private _moveDir = new Vec3();
    private _velocity = new Vec3();
    private _forward = new Vec3();
    private _right = new Vec3();

    onLoad() {
        this._setupController();
        input.on(Input.EventType.KEY_DOWN, this._onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this._onKeyUp, this);
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this._onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this._onKeyUp, this);
    }

    start() {
        if (!this.mainCamera) {
            this.mainCamera = this.node.scene?.getChildByName('Main Camera')?.getComponent(Camera) ?? null;
        }
    }

    update(deltaTime: number) {
        if (!this._controller) {
            return;
        }

        this._updateVerticalVelocity(deltaTime);
        this._updateHorizontalMove(deltaTime);
        this._controller.move(this._velocity);
    }

    /** 初始化角色控制器，参数与内置 Capsule 网格（高 2、半径 0.5、中心在原点）对齐 */
    private _setupController() {
        let controller = this.getComponent(CapsuleCharacterController);
        if (!controller) {
            controller = this.addComponent(CapsuleCharacterController);
        }
        controller.radius = 0.5;
        controller.height = 1;
        controller.center = new Vec3(0, 0, 0);
        controller.stepOffset = 0.3;
        controller.slopeLimit = 45;
        controller.skinWidth = 0.001;
        controller.minMoveDistance = 0;
        this._controller = controller;
    }

    /** 获取角色控制器胶囊体底部（相对节点原点的本地 Y） */
    getControllerBottomLocalY(): number {
        const c = this._controller;
        if (!c) {
            return PLAYER_FEET_LOCAL_Y;
        }
        return c.center.y - c.height * 0.5 - c.radius;
    }

    /** 将角色脚底对齐到指定世界高度 */
    snapFeetToWorldY(surfaceY: number) {
        const bottomLocalY = this.getControllerBottomLocalY();
        const wp = this.node.worldPosition;
        this.node.setWorldPosition(wp.x, surfaceY - bottomLocalY * this.node.worldScale.y, wp.z);
    }

    private _onKeyDown(event: EventKeyboard) {
        switch (event.keyCode) {
            case KeyCode.KEY_W:
            case KeyCode.ARROW_UP:
                this._moveInput.z = 1;
                break;
            case KeyCode.KEY_S:
            case KeyCode.ARROW_DOWN:
                this._moveInput.z = -1;
                break;
            case KeyCode.KEY_A:
            case KeyCode.ARROW_LEFT:
                this._moveInput.x = -1;
                break;
            case KeyCode.KEY_D:
            case KeyCode.ARROW_RIGHT:
                this._moveInput.x = 1;
                break;
            case KeyCode.SPACE:
                this._jumpRequested = true;
                break;
        }
    }

    private _onKeyUp(event: EventKeyboard) {
        switch (event.keyCode) {
            case KeyCode.KEY_W:
            case KeyCode.ARROW_UP:
                if (this._moveInput.z > 0) {
                    this._moveInput.z = 0;
                }
                break;
            case KeyCode.KEY_S:
            case KeyCode.ARROW_DOWN:
                if (this._moveInput.z < 0) {
                    this._moveInput.z = 0;
                }
                break;
            case KeyCode.KEY_A:
            case KeyCode.ARROW_LEFT:
                if (this._moveInput.x < 0) {
                    this._moveInput.x = 0;
                }
                break;
            case KeyCode.KEY_D:
            case KeyCode.ARROW_RIGHT:
                if (this._moveInput.x > 0) {
                    this._moveInput.x = 0;
                }
                break;
        }
    }

    /** 处理跳跃与重力 */
    private _updateVerticalVelocity(deltaTime: number) {
        const controller = this._controller!;
        if (controller.isGrounded) {
            if (this._jumpRequested) {
                this._verticalVelocity = this.jumpSpeed;
                this._jumpRequested = false;
            } else {
                // 轻微下压，避免 isGrounded 抖动
                this._verticalVelocity = -1;
            }
        } else {
            this._verticalVelocity += this.gravity * deltaTime;
            this._jumpRequested = false;
        }
    }

    /** 根据相机朝向计算水平移动，并令角色面向移动方向 */
    private _updateHorizontalMove(deltaTime: number) {
        this._moveDir.set(0, 0, 0);

        if (this._moveInput.lengthSqr() > 0) {
            const cameraNode = this.mainCamera?.node;
            if (cameraNode) {
                Vec3.copy(this._forward, cameraNode.forward);
                this._forward.y = 0;
                this._forward.normalize();

                Vec3.copy(this._right, cameraNode.right);
                this._right.y = 0;
                this._right.normalize();

                this._moveDir.set(0, 0, 0);
                Vec3.scaleAndAdd(this._moveDir, this._moveDir, this._forward, this._moveInput.z);
                Vec3.scaleAndAdd(this._moveDir, this._moveDir, this._right, this._moveInput.x);
                this._moveDir.normalize();
            } else {
                this._moveDir.set(this._moveInput.x, 0, this._moveInput.z);
                this._moveDir.normalize();
            }

            // 角色朝向移动方向
            Quat.fromViewUp(this.node.rotation, this._moveDir, Vec3.UP);
        }

        this._velocity.set(
            this._moveDir.x * this.moveSpeed * deltaTime,
            this._verticalVelocity * deltaTime,
            this._moveDir.z * this.moveSpeed * deltaTime,
        );
    }
}
