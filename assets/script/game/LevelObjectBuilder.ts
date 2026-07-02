import { Node } from 'cc';
import { ObjectConfig, quatFromJson, vec3FromJson } from './LevelData';
import { ObjectTypeRegistry } from './ObjectTypeRegistry';
import { MeshLoader } from './MeshLoader';

/** 根据关卡配置生成单个物体的可视化模型节点（仅建模，不含玩法/物理逻辑） */
export class LevelObjectBuilder {
    /** 加载 mesh 并按配置摆放到 parent（一般为所属平台节点）下 */
    static async build(obj: ObjectConfig, registry: ObjectTypeRegistry, parent: Node): Promise<Node> {
        const meshName = registry.resolveMeshName(obj);
        let node: Node;
        try {
            node = await MeshLoader.instantiate(meshName, parent);
        } catch (e) {
            node = await MeshLoader.instantiate('Cube', parent);
            console.warn(`[LevelObjectBuilder] mesh ${meshName} 加载失败，使用 Cube 兜底`, e);
        }

        node.name = `Obj_${obj.type}`;
        node.setPosition(vec3FromJson(obj.pos));
        node.setRotation(quatFromJson(obj.rot));
        node.setScale(vec3FromJson(obj.size));
        return node;
    }
}
