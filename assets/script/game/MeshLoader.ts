import { assetManager, AssetManager, instantiate, Node, Prefab } from 'cc';

const BUNDLE_NAME = 'mesh';
const _cache = new Map<string, Prefab>();
let _bundlePromise: Promise<AssetManager.Bundle> | null = null;

/** 从 mesh Asset Bundle 加载 glb 预制体并实例化 */
export class MeshLoader {
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

    /** 加载 mesh 预制体（带缓存） */
    static loadPrefab(meshName: string): Promise<Prefab> {
        const cached = _cache.get(meshName);
        if (cached) {
            return Promise.resolve(cached);
        }

        return MeshLoader._getBundle()
            .then((bundle) => {
                const paths = [meshName, `${meshName}/${meshName}`];
                return MeshLoader._loadFirst(bundle, paths);
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
