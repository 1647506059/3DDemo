import {
    assetManager,
    AssetManager,
    instantiate,
    JsonAsset,
    Node,
    Prefab,
    resources,
} from 'cc';

const BUNDLE_NAME = 'mesh';
const _cache = new Map<string, Prefab>();
let _bundlePromise: Promise<AssetManager.Bundle> | null = null;
let _uuidMap: Record<string, string> | null = null;
let _uuidMapPromise: Promise<Record<string, string>> | null = null;

/** 从 mesh Asset Bundle / UUID 加载 glb 预制体并实例化 */
export class MeshLoader {
    /** 读取 mesh 名 → prefab uuid 映射表 */
    private static _loadUuidMap(): Promise<Record<string, string>> {
        if (_uuidMap) {
            return Promise.resolve(_uuidMap);
        }
        if (_uuidMapPromise) {
            return _uuidMapPromise;
        }

        _uuidMapPromise = new Promise((resolve) => {
            resources.load('config/mesh-uuid-map', JsonAsset, (err, asset) => {
                _uuidMap = err || !asset ? {} : (asset.json as Record<string, string>);
                resolve(_uuidMap);
            });
        });
        return _uuidMapPromise;
    }

    /** 获取 mesh 分包（assets/mesh 已配置为 Bundle） */
    private static _getBundle(): Promise<AssetManager.Bundle> {
        if (_bundlePromise) {
            return _bundlePromise;
        }

        _bundlePromise = new Promise((resolve, reject) => {
            const existing = assetManager.getBundle(BUNDLE_NAME);
            if (existing) {
                resolve(existing);
                return;
            }

            assetManager.loadBundle(BUNDLE_NAME, (err, bundle) => {
                if (err || !bundle) {
                    _bundlePromise = null;
                    reject(err ?? new Error(`mesh 分包加载失败: ${BUNDLE_NAME}`));
                    return;
                }
                resolve(bundle);
            });
        });

        return _bundlePromise;
    }

    /** 通过 prefab uuid 加载（编辑器预览兜底） */
    private static async _loadViaUuid(meshName: string): Promise<Prefab> {
        const map = await MeshLoader._loadUuidMap();
        const uuid = map[meshName];
        if (!uuid) {
            throw new Error(`mesh-uuid-map 中无 ${meshName}`);
        }

        return new Promise((resolve, reject) => {
            assetManager.loadAny({ uuid }, (err, asset) => {
                if (err || !asset) {
                    reject(err ?? new Error(`UUID 加载失败: ${meshName}`));
                    return;
                }
                resolve(asset as Prefab);
            });
        });
    }

    /** 分包内依次尝试多个路径 */
    private static async _loadViaBundle(meshName: string): Promise<Prefab> {
        const bundle = await MeshLoader._getBundle();
        const paths = [
            meshName,
            `${meshName}.glb`,
            `${meshName}/${meshName}`,
            `${meshName}/${meshName}.glb`,
        ];
        return MeshLoader._loadFirst(bundle, paths);
    }

    /** 加载 mesh 预制体（带缓存）：先分包，再 UUID 兜底 */
    static loadPrefab(meshName: string): Promise<Prefab> {
        const cached = _cache.get(meshName);
        if (cached) {
            return Promise.resolve(cached);
        }

        return MeshLoader._loadViaBundle(meshName)
            .catch((bundleErr) => {
                console.warn(`[MeshLoader] 分包加载 ${meshName} 失败，尝试 UUID`, bundleErr);
                return MeshLoader._loadViaUuid(meshName);
            })
            .then((prefab) => {
                _cache.set(meshName, prefab);
                return prefab;
            });
    }

    /** 依次尝试多个分包内路径 */
    private static _loadFirst(bundle: AssetManager.Bundle, paths: string[]): Promise<Prefab> {
        return new Promise((resolve, reject) => {
            let index = 0;
            const tryNext = () => {
                if (index >= paths.length) {
                    reject(new Error(`分包 mesh 中未找到: ${paths.join(' | ')}`));
                    return;
                }
                const path = paths[index++];
                bundle.load(path, Prefab, (err, prefab) => {
                    if (err || !prefab) {
                        tryNext();
                        return;
                    }
                    resolve(prefab);
                });
            };
            tryNext();
        });
    }

    /** 加载并实例化 mesh 节点 */
    static async instantiate(meshName: string, parent?: Node): Promise<Node> {
        const prefab = await MeshLoader.loadPrefab(meshName);
        const node = instantiate(prefab);
        if (parent) {
            node.setParent(parent);
        }
        return node;
    }

    /** 预加载多个 mesh */
    static preload(names: string[]): Promise<void> {
        return Promise.all(names.map((n) => MeshLoader.loadPrefab(n).catch(() => null))).then(() => undefined);
    }
}
