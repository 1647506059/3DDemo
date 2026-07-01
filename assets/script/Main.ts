import { _decorator, Component, Node, MeshRenderer, PhysicsSystem } from 'cc';
import { WalkableGround } from './WalkableGround';
import { PhysicsDebug } from './PhysicsDebug';
import { GameManager } from './game/GameManager';

const { ccclass, property } = _decorator;

/** 场景入口：初始化地面与游戏管理器 */
@ccclass('Main')
export class Main extends Component {
    @property({ type: Node, tooltip: '主地面节点（Plane / Ground）' })
    ground: Node | null = null;

    @property({ type: [Node], tooltip: '额外地面节点列表' })
    grounds: Node[] = [];

    @property({ tooltip: '起始关卡号' })
    levelIndex = 1;

    @property({ tooltip: '预览时显示物理碰撞盒线框' })
    showColliderGizmo = true;

    onLoad() {
        this._resolveNodes();
        this._disableLegacyPlayer();
        if (this.showColliderGizmo) {
            PhysicsDebug.enableColliderDraw();
        }
    }

    start() {
        this._setupGrounds();
        PhysicsSystem.instance.syncSceneToPhysics();

        let gm = this.node.getComponent(GameManager);
        if (!gm) {
            gm = this.node.addComponent(GameManager);
        }
        gm.levelIndex = this.levelIndex;
    }

    private _setupGrounds() {
        const nodes: Node[] = [];
        if (this.ground) {
            nodes.push(this.ground);
        }
        for (const g of this.grounds) {
            if (g) {
                nodes.push(g);
            }
        }

        if (nodes.length === 0) {
            console.warn('[Main] 未找到地面节点');
            return;
        }

        for (const node of nodes) {
            WalkableGround.setup(node);
        }
    }

    private _resolveNodes() {
        if (!this.ground) {
            const scene = this.node.scene;
            this.ground = scene?.getChildByName('Plane')
                ?? scene?.getChildByName('Ground')
                ?? null;
        }
    }

    /** 禁用旧 Demo 的 Player 节点 */
    private _disableLegacyPlayer() {
        const player = this.node.scene?.getChildByName('Player');
        if (player) {
            player.active = false;
        }
    }
}
