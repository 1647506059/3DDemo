import {
    _decorator,
    Component,
    Node,
    director,
    Camera,
    Quat,
} from 'cc';
import { GameState } from './GameState';
import { ObjectTypeRegistry } from './ObjectTypeRegistry';
import { LevelLoader } from './LevelLoader';
import { CannonController } from './CannonController';
import { GameUI } from '../ui/GameUI';

const { ccclass, property } = _decorator;

/** 游戏总控：关卡、炮弹、胜负 */
@ccclass('GameManager')
export class GameManager extends Component {
    @property({ tooltip: '起始关卡号' })
    levelIndex = 1;

    @property({ type: Node, tooltip: '关卡根节点' })
    levelRoot: Node | null = null;

    @property({ type: Node, tooltip: '炮塔节点' })
    cannonNode: Node | null = null;

    @property({ tooltip: '物理稳定等待超时（秒）' })
    settleTimeout = 2;

    private _state: GameState = GameState.Loading;
    private _remainingBalls = 0;
    private _activeTargetCount = 0;
    private _registry = new ObjectTypeRegistry();
    private _loader = new LevelLoader(this._registry);
    private _cannon: CannonController | null = null;
    private _ui: GameUI | null = null;
    private _settleTimer = 0;
    private _bootstrapped = false;

    get remainingBalls(): number {
        return this._remainingBalls;
    }

    get state(): GameState {
        return this._state;
    }

    onLoad() {
        this._setupFixedCamera();
        this._disablePlayer();
    }

    async start() {
        await this._bootstrap();
        await this.loadLevel(this.levelIndex);
    }

    update(dt: number) {
        if (this._state !== GameState.Settling) {
            return;
        }
        this._settleTimer += dt;
        if (this._settleTimer >= this.settleTimeout) {
            this._finishSettle();
        }
    }

    /** 加载关卡 */
    async loadLevel(index: number) {
        this._state = GameState.Loading;
        this.levelIndex = index;
        this._ui?.hideResult();
        this._cannon?.setInputEnabled(false);

        if (!this.levelRoot) {
            this.levelRoot = new Node('LevelRoot');
            this.levelRoot.setParent(this.node);
        }

        await this._registry.init();
        const result = await this._loader.loadLevel(
            index,
            this.levelRoot,
            () => this._onTargetKnocked(),
        );

        this._remainingBalls = result.config.moveCount;
        this._activeTargetCount = result.targets.length;

        this._ui?.updateBalls(this._remainingBalls);
        this._state = GameState.Ready;
        this._cannon?.setInputEnabled(true);
    }

    private async _bootstrap() {
        if (this._bootstrapped) {
            return;
        }
        this._bootstrapped = true;

        const scene = director.getScene();
        if (!scene) {
            return;
        }

        this._ui = GameUI.create(scene);
        this._ui.setCallbacks(
            () => this.loadLevel(this.levelIndex),
            () => this.loadLevel(this.levelIndex + 1),
        );

        if (!this.cannonNode) {
            this.cannonNode = new Node('Cannon');
            this.cannonNode.setParent(scene);
            this.cannonNode.setPosition(0, 0, -6);
        }

        this._cannon = this.cannonNode.getComponent(CannonController)
            ?? this.cannonNode.addComponent(CannonController);
        await this._cannon.initModels();
        this._cannon.setFireCallback(() => this._onFire());
    }

    private _onFire() {
        if (this._state !== GameState.Ready) {
            return;
        }
        if (this._remainingBalls <= 0) {
            return;
        }
        this._remainingBalls--;
        this._ui?.updateBalls(this._remainingBalls);
        this._state = GameState.Firing;
        this._cannon?.setInputEnabled(false);
        this.scheduleOnce(() => {
            this._state = GameState.Settling;
            this._settleTimer = 0;
        }, 0.15);
    }

    private _onTargetKnocked() {
        this._activeTargetCount = Math.max(0, this._activeTargetCount - 1);
        if (this._activeTargetCount === 0) {
            this._state = GameState.Win;
            this._cannon?.setInputEnabled(false);
            this._ui?.showWin();
        }
    }

    private _finishSettle() {
        if (this._state === GameState.Win || this._state === GameState.Lose) {
            return;
        }
        if (this._activeTargetCount === 0) {
            return;
        }
        if (this._remainingBalls <= 0) {
            this._state = GameState.Lose;
            this._cannon?.setInputEnabled(false);
            this._ui?.showLose();
            return;
        }
        this._state = GameState.Ready;
        this._cannon?.setInputEnabled(true);
    }

    private _setupFixedCamera() {
        const scene = director.getScene();
        const camNode = scene?.getChildByName('Main Camera');
        if (!camNode) {
            return;
        }
        camNode.setPosition(0, 1.5, -8);
        const rot = new Quat();
        Quat.fromEuler(rot, 10, 0, 0);
        camNode.setRotation(rot);
        const cam = camNode.getComponent(Camera);
        if (cam) {
            cam.fov = 45;
        }
    }

    private _disablePlayer() {
        const scene = director.getScene();
        const player = scene?.getChildByName('Player');
        if (player) {
            player.active = false;
        }
    }
}
