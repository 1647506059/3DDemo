import { JsonAsset, resources } from 'cc';
import {
    ObjectConfig,
    ObjectTypeEntry,
    ObjectTypeMap,
    resolveMeshName,
} from './LevelData';
import { MeshLoader } from './MeshLoader';

/** 物体 type → mesh 映射注册表 */
export class ObjectTypeRegistry {
    private _map: ObjectTypeMap = {};
    private _ready = false;

    /** 加载 config/object-type-map.json */
    async init(): Promise<void> {
        if (this._ready) {
            return;
        }

        await new Promise<void>((resolve, reject) => {
            resources.load('config/object-type-map', JsonAsset, (err, asset) => {
                if (err || !asset) {
                    console.warn('[ObjectTypeRegistry] 加载映射失败，使用空映射', err);
                    this._map = {};
                    this._ready = true;
                    resolve();
                    return;
                }
                this._map = asset.json as ObjectTypeMap;
                this._ready = true;
                resolve();
            });
        });

        const meshNames = new Set<string>();
        for (const key of Object.keys(this._map)) {
            meshNames.add(this._map[key].mesh);
        }
        meshNames.add('Cube');
        meshNames.add('TableTop');
        meshNames.add('TablePole');
        await MeshLoader.preload([...meshNames]);
    }

    getEntry(type: number): ObjectTypeEntry {
        const entry = this._map[String(type)];
        if (entry) {
            return entry;
        }
        console.warn(`[ObjectTypeRegistry] 未知 type=${type}，使用默认 box`);
        return { mesh: 'box_1x1', collider: 'box', mass: 1.0 };
    }

    resolveMeshName(obj: ObjectConfig): string {
        const entry = this.getEntry(obj.type);
        return resolveMeshName(obj.type, obj.size, entry);
    }

    getMass(type: number): number {
        return this.getEntry(type).mass;
    }
}
