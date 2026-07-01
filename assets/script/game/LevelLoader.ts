import { JsonAsset, Node, PhysicsSystem, resources } from 'cc';
import { LevelConfig, StageConfig } from './LevelData';
import { ObjectTypeRegistry } from './ObjectTypeRegistry';
import { TableBuilder, TableInfo } from './TableBuilder';
import { TargetBlock } from './TargetBlock';

/** 关卡加载结果 */
export interface LevelLoadResult {
    config: LevelConfig;
    targets: TargetBlock[];
    tables: TableInfo[];
}

/** 从 JSON 加载关卡并生成物理目标 */
export class LevelLoader {
    constructor(private _registry: ObjectTypeRegistry) {}

    /** 加载指定关卡到 levelRoot */
    async loadLevel(
        levelIndex: number,
        levelRoot: Node,
        onKnocked?: (block: TargetBlock) => void,
    ): Promise<LevelLoadResult> {
        levelRoot.removeAllChildren();

        const config = await this._loadConfig(levelIndex);
        const stage = config.stages[0];
        if (!stage) {
            throw new Error(`关卡 ${levelIndex} 无 stages 数据`);
        }

        const tableMap = new Map<number, TableInfo>();
        for (const tableCfg of stage.tables) {
            const info = await TableBuilder.build(tableCfg, levelRoot);
            tableMap.set(tableCfg.id, info);
        }

        const targets: TargetBlock[] = [];
        for (const objCfg of stage.objects) {
            const table = tableMap.get(objCfg.tableId);
            if (!table) {
                console.warn(`[LevelLoader] 找不到 tableId=${objCfg.tableId}`);
                continue;
            }

            const block = await TargetBlock.create(
                objCfg,
                this._registry,
                table,
                table.node,
                () => { /* 稍后绑定 */ },
            );
            block.setKnockCallback(() => onKnocked?.(block));
            targets.push(block);
        }

        PhysicsSystem.instance.syncSceneToPhysics();
        return { config, targets, tables: [...tableMap.values()] };
    }

    private _loadConfig(levelIndex: number): Promise<LevelConfig> {
        const path = `prod-13-json/Level${levelIndex}`;
        return new Promise((resolve, reject) => {
            resources.load(path, JsonAsset, (err, asset) => {
                if (err || !asset) {
                    reject(err ?? new Error(`无法加载关卡 ${levelIndex}`));
                    return;
                }
                resolve(asset.json as LevelConfig);
            });
        });
    }
}
