import {
    _decorator,
    Component,
    ERigidBodyType,
    RigidBody,
    SphereCollider,
    PhysicsMaterial,
    Vec3,
} from 'cc';

const { ccclass, property } = _decorator;

/** 炮弹：动态刚体，受击后自动销毁 */
@ccclass('Projectile')
export class Projectile extends Component {
    @property({ tooltip: '存活时间（秒）' })
    lifetime = 5;

    private _alive = 0;

    onLoad() {
        let body = this.getComponent(RigidBody);
        if (!body) {
            body = this.addComponent(RigidBody);
        }
        body.type = ERigidBodyType.DYNAMIC;
        body.mass = 0.5;
        body.linearDamping = 0.01;

        let col = this.getComponent(SphereCollider);
        if (!col) {
            col = this.addComponent(SphereCollider);
        }
        col.radius = 0.25;

        const mat = new PhysicsMaterial();
        mat.friction = 0.3;
        mat.restitution = 0.35;
        col.material = mat;
    }

    /** 沿方向施加冲量 */
    fire(direction: Vec3, impulse: number) {
        const body = this.getComponent(RigidBody);
        if (!body) {
            return;
        }
        const dir = direction.clone().normalize();
        body.applyImpulse(dir.multiplyScalar(impulse));
    }

    update(dt: number) {
        this._alive += dt;
        if (this._alive >= this.lifetime) {
            this.node.destroy();
        }
    }
}
