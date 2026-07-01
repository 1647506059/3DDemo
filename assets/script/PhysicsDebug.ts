import { PhysicsSystem, EPhysicsDrawFlags } from 'cc';

/** 物理调试绘制工具 */
export class PhysicsDebug {
    /** 开启碰撞盒线框与 AABB 渲染 */
    static enableColliderDraw(): void {
        PhysicsSystem.instance.debugDrawFlags =
            EPhysicsDrawFlags.WIRE_FRAME | EPhysicsDrawFlags.AABB;
    }

    /** 关闭物理调试绘制 */
    static disableColliderDraw(): void {
        PhysicsSystem.instance.debugDrawFlags = EPhysicsDrawFlags.NONE;
    }
}
