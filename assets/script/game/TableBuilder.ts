import {
    BoxCollider,
    ERigidBodyType,
    Node,
    Quat,
    RigidBody,
    Vec3,
} from 'cc';
import { quatFromJson, TableConfig, vec3FromJson } from './LevelData';
import { MeshLoader } from './MeshLoader';

/** 平台顶面世界 Y 与半径信息 */
export interface TableInfo {
    node: Node;
    topY: number;
    radius: number;
}

/** 拼装静态射击平台（局部 y=0 为台面） */
export class TableBuilder {
    /** 根据配置创建平台节点 */
    static async build(cfg: TableConfig, parent: Node): Promise<TableInfo> {
        const root = new Node(`Table_${cfg.id}`);
        root.setParent(parent);
        root.setPosition(vec3FromJson(cfg.pos));
        root.setRotation(quatFromJson(cfg.rot));
        root.setScale(vec3FromJson(cfg.scl));

        const dim = cfg.dim;
        const poleH = Math.max(dim.y, 0.5);
        const topW = Math.max(dim.x, 1);
        const topD = Math.max(Math.abs(dim.z), 1);

        try {
            const pole = await MeshLoader.instantiate('TablePole', root);
            pole.setPosition(0, -poleH * 0.5, 0);
            pole.setScale(1, poleH, 1);
        } catch (e) {
            console.warn('[TableBuilder] TablePole 加载失败', e);
        }

        try {
            const top = await MeshLoader.instantiate('TableTop', root);
            top.setPosition(0, 0, 0);
            top.setScale(topW, 1, topD);
        } catch (e) {
            console.warn('[TableBuilder] TableTop 加载失败', e);
        }

        const body = root.addComponent(RigidBody);
        body.type = ERigidBodyType.STATIC;

        const collider = root.addComponent(BoxCollider);
        collider.size = new Vec3(topW, 0.2, topD);
        collider.center = new Vec3(0, 0, 0);

        const wp = root.worldPosition;
        const topY = wp.y;
        const radius = Math.sqrt(topW * topW + topD * topD) * 0.5;

        return { node: root, topY, radius };
    }
}
