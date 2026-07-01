import { _decorator, Component, Node, MeshRenderer, PhysicsSystem, geometry } from 'cc';
import { CameraFollow } from './CameraFollow';
import { WalkableGround } from './WalkableGround';
import { PhysicsDebug } from './PhysicsDebug';
import { Player } from './Player';

const { ccclass, property } = _decorator;

/** 场景初始化：适配所有地面为可行走，并配置相机跟随 */
@ccclass('Main')
export class Main extends Component {
    @property({ type: Node, tooltip: '主地面节点（Plane / Ground）' })
    ground: Node | null = null;

    @property({ type: [Node], tooltip: '额外地面节点列表' })
    grounds: Node[] = [];

    @property({ type: Node, tooltip: '玩家节点' })
    player: Node | null = null;

    @property({ tooltip: '预览时显示物理碰撞盒线框' })
    showColliderGizmo = true;

    private _groundNodes: Node[] = [];

    onLoad() {
        this._resolveNodes();
        if (this.showColliderGizmo) {
            PhysicsDebug.enableColliderDraw();
        }
    }

    start() {
        this._groundNodes = this._collectGroundNodes();
        this._setupGrounds();
        PhysicsSystem.instance.syncSceneToPhysics();
        // 等碰撞体注册后再对齐玩家
        this.scheduleOnce(() => {
            this._alignPlayerToGround();
            this._setupCameraFollow();
        }, 0);
    }

    /** 未在 Inspector 绑定时，从 Main 子节点中查找 */
    private _resolveNodes() {
        if (!this.player) {
            this.player = this.node.getChildByName('Player');
        }
        if (!this.ground) {
            this.ground = this.node.getChildByName('Ground')
                ?? this.node.getChildByName('Plane');
        }
    }

    /** 收集所有需要适配的地面：绑定引用 + Main 下除 Player 外的 mesh 节点 */
    private _collectGroundNodes(): Node[] {
        const set = new Set<Node>();

        if (this.ground) {
            set.add(this.ground);
        }
        for (const node of this.grounds) {
            if (node) {
                set.add(node);
            }
        }

        for (const child of this.node.children) {
            if (child === this.player) {
                continue;
            }
            if (child.getComponent(MeshRenderer)) {
                set.add(child);
            }
        }

        return Array.from(set);
    }

    /** 将所有地面适配为可行走 */
    private _setupGrounds() {
        if (this._groundNodes.length === 0) {
            console.warn('[Main] 未找到地面节点，请在 Main 下添加 Plane/Ground 或在 Inspector 中绑定');
            return;
        }

        for (const node of this._groundNodes) {
            WalkableGround.setup(node);
        }
    }

    /** 将玩家脚底对齐到 mesh 顶面（与可视地面对齐） */
    private _alignPlayerToGround() {
        if (!this.player) {
            return;
        }

        const wp = this.player.worldPosition;
        let surfaceY = this._findMeshSurfaceAt(wp.x, wp.z);

        if (surfaceY === null) {
            surfaceY = this._groundNodes.reduce(
                (max, node) => Math.max(max, WalkableGround.getMeshSurfaceWorldY(node)),
                -Infinity,
            );
        }
        if (!Number.isFinite(surfaceY)) {
            surfaceY = 0;
        }

        const playerComp = this.player.getComponent(Player);
        if (playerComp) {
            playerComp.snapFeetToWorldY(surfaceY);
        } else {
            this.player.setWorldPosition(wp.x, surfaceY + 1, wp.z);
        }

        PhysicsSystem.instance.syncSceneToPhysics();
    }

    /** 查找玩家脚下最近的地面 mesh 顶面高度 */
    private _findMeshSurfaceAt(worldX: number, worldZ: number): number | null {
        const ray = new geometry.Ray(worldX, 100, worldZ, 0, -1, 0);
        if (!PhysicsSystem.instance.raycast(ray, 0xffffffff, 200, true)) {
            return null;
        }

        const groundSet = new Set(this._groundNodes);
        const results = PhysicsSystem.instance.raycastResults;

        for (let i = 0; i < results.length; i++) {
            const hit = results[i];
            const hitNode = hit.collider?.node;
            if (!hitNode) {
                continue;
            }

            const groundNode = this._findGroundRoot(hitNode, groundSet);
            if (groundNode) {
                // 用 mesh 顶面对齐，避免碰撞体比 mesh 高导致悬浮
                return WalkableGround.getMeshSurfaceWorldY(groundNode);
            }
        }

        return null;
    }

    /** 命中 collider 后找到对应的地面根节点 */
    private _findGroundRoot(node: Node, groundSet: Set<Node>): Node | null {
        let current: Node | null = node;
        while (current) {
            if (groundSet.has(current)) {
                return current;
            }
            current = current.parent;
        }
        return null;
    }

    /** 为主相机挂载跟随脚本 */
    private _setupCameraFollow() {
        const scene = this.node.scene;
        if (!scene) {
            return;
        }

        const cameraNode = scene.getChildByName('Main Camera');
        if (!cameraNode || !this.player) {
            console.warn('[Main] 未找到相机或玩家节点');
            return;
        }

        let follow = cameraNode.getComponent(CameraFollow);
        if (!follow) {
            follow = cameraNode.addComponent(CameraFollow);
        }
        follow.target = this.player;
        follow.smoothSpeed = 8;
    }
}
