import {
    _decorator,
    BoxCollider,
    Component,
    ERigidBodyType,
    Node,
    PhysicsMaterial,
    RigidBody,
    Vec3,
} from 'cc';
import { quatFromJson, vec3FromJson, ObjectConfig } from './LevelData';
import { ObjectTypeRegistry } from './ObjectTypeRegistry';
import { MeshLoader } from './MeshLoader';
import { TableInfo } from './TableBuilder';

const { ccclass } = _decorator;

/** 可击倒目标块 */
@ccclass('TargetBlock')
export class TargetBlock extends Component {
    private _knocked = false;
    private _tableTopY = 0;
    private _tableRadius = 3;
    private _tableCenter = new Vec3();
    private _onKnocked: (() => void) | null = null;

    get isKnocked(): boolean {
        return this._knocked;
    }

    /** 设置击倒回调 */
    setKnockCallback(cb: () => void) {
        this._onKnocked = cb;
    }

    /** 初始化目标块 */
    static async create(
        obj: ObjectConfig,
        registry: ObjectTypeRegistry,
        table: TableInfo,
        parent: Node,
        onKnocked: () => void,
    ): Promise<TargetBlock> {
        const meshName = registry.resolveMeshName(obj);
        let node: Node;
        try {
            node = await MeshLoader.instantiate(meshName, parent);
        } catch {
            node = await MeshLoader.instantiate('Cube', parent);
            console.warn(`[TargetBlock] mesh ${meshName} 加载失败，使用 Cube`);
        }

        node.name = `Target_${obj.type}`;
        node.setPosition(vec3FromJson(obj.pos));
        node.setRotation(quatFromJson(obj.rot));
        node.setScale(vec3FromJson(obj.size));

        const comp = node.addComponent(TargetBlock);
        comp._onKnocked = onKnocked;
        comp._tableTopY = table.topY;
        comp._tableRadius = table.radius;
        comp._tableCenter.set(table.node.worldPosition);

        const mass = registry.getMass(obj.type);
        comp._setupPhysics(mass, obj.size);
        return comp;
    }

    private _setupPhysics(mass: number, size: { x: number; y: number; z: number }) {
        const body = this.node.addComponent(RigidBody);
        body.type = ERigidBodyType.DYNAMIC;
        body.mass = mass;
        body.linearDamping = 0.05;
        body.angularDamping = 0.1;

        const mat = new PhysicsMaterial();
        mat.friction = 0.4;
        mat.restitution = 0.2;

        const col = this.node.addComponent(BoxCollider);
        col.size = new Vec3(size.x, size.y, size.z);
        col.material = mat;
    }

    update() {
        if (this._knocked) {
            return;
        }
        if (this._checkKnocked()) {
            this._knocked = true;
            this._onKnocked?.();
        }
    }

    private _checkKnocked(): boolean {
        const wp = this.node.worldPosition;
        if (wp.y < this._tableTopY - 0.3) {
            return true;
        }
        const dx = wp.x - this._tableCenter.x;
        const dz = wp.z - this._tableCenter.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        return dist > this._tableRadius + 0.5;
    }
}
