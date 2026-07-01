import {
    _decorator,
    Component,
    Node,
    MeshRenderer,
    BoxCollider,
    RigidBody,
    ERigidBodyType,
    Vec3,
} from 'cc';

const { ccclass } = _decorator;

/** 胶囊体网格底部相对节点原点的本地 Y（中心在原点、高 2、半径 0.5） */
export const PLAYER_FEET_LOCAL_Y = -1;

/** 地面碰撞体最小厚度（世界空间单位），避免 Plane 无法被检测到 */
const MIN_COLLIDER_HEIGHT = 0.05;

/**
 * 可行走地面工具：根据 mesh 包围盒自动配置 BoxCollider + 静态刚体
 */
export class WalkableGround {
    /** 配置节点为可行走地面 */
    static setup(node: Node): void {
        WalkableGround._ensureStaticBody(node);
        WalkableGround._fitBoxCollider(node);
    }

    /** 获取 mesh 顶面世界坐标 Y（用于视觉对齐） */
    static getMeshSurfaceWorldY(node: Node): number {
        const mesh = node.getComponent(MeshRenderer)?.mesh;
        if (mesh?.struct?.maxPosition) {
            const max = mesh.struct.maxPosition;
            const ws = node.worldScale;
            return node.worldPosition.y + max.y * ws.y;
        }
        return node.worldPosition.y;
    }

    /** 获取碰撞体顶面世界坐标 Y */
    static getColliderTopWorldY(node: Node): number {
        const collider = node.getComponent(BoxCollider);
        if (collider) {
            const bounds = collider.worldBounds;
            return bounds.center.y + bounds.halfExtents.y;
        }
        return WalkableGround.getMeshSurfaceWorldY(node);
    }

    private static _ensureStaticBody(node: Node): void {
        let body = node.getComponent(RigidBody);
        if (!body) {
            body = node.addComponent(RigidBody);
        }
        body.type = ERigidBodyType.STATIC;
        body.enabled = true;
    }

    /** 按 mesh 包围盒适配 BoxCollider，薄片顶面对齐 mesh 上沿 */
    private static _fitBoxCollider(node: Node): void {
        let collider = node.getComponent(BoxCollider);
        if (!collider) {
            collider = node.addComponent(BoxCollider);
        }
        collider.isTrigger = false;

        const mesh = node.getComponent(MeshRenderer)?.mesh;
        const min = mesh?.struct?.minPosition;
        const max = mesh?.struct?.maxPosition;
        if (!min || !max) {
            return;
        }

        const size = new Vec3(max.x - min.x, max.y - min.y, max.z - min.z);
        const center = new Vec3(
            (min.x + max.x) * 0.5,
            (min.y + max.y) * 0.5,
            (min.z + max.z) * 0.5,
        );

        if (size.y < MIN_COLLIDER_HEIGHT) {
            const topY = max.y;
            // 碰撞体顶面精确对齐 mesh 上沿，避免角色悬浮在可视地面之上
            size.y = MIN_COLLIDER_HEIGHT;
            center.y = topY - MIN_COLLIDER_HEIGHT * 0.5;
        }

        size.x = Math.max(size.x, 0.01);
        size.z = Math.max(size.z, 0.01);

        collider.size = size;
        collider.center = center;
    }
}

/** 挂到任意地面节点上，运行时自动变为可行走地面 */
@ccclass('WalkableGround')
export class WalkableGroundComponent extends Component {
    onLoad() {
        WalkableGround.setup(this.node);
    }
}
