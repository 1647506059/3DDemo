import {
    _decorator,
    Component,
    Label,
    Node,
    UITransform,
    Widget,
    Color,
    Size,
    Canvas,
    Camera,
} from 'cc';

const { ccclass, property } = _decorator;

/** 游戏 HUD 与结算 UI */
@ccclass('GameUI')
export class GameUI extends Component {
    @property(Label)
    ballsLabel: Label | null = null;

    @property(Label)
    resultLabel: Label | null = null;

    @property(Node)
    resultPanel: Node | null = null;

    private _onRetry: (() => void) | null = null;
    private _onNext: (() => void) | null = null;

    /** 运行时创建最简 UI（无 prefab 时） */
    static create(parent: Node): GameUI {
        let canvas = parent.getChildByName('Canvas');
        if (!canvas) {
            canvas = new Node('Canvas');
            canvas.setParent(parent);
            canvas.addComponent(UITransform).setContentSize(new Size(1280, 720));
            const canvasComp = canvas.addComponent(Canvas);
            const camNode = parent.getChildByName('Main Camera');
            if (camNode) {
                canvasComp.cameraComponent = camNode.getComponent(Camera);
            }
        }

        let uiRoot = canvas.getChildByName('GameUI');
        if (!uiRoot) {
            uiRoot = new Node('GameUI');
            uiRoot.setParent(canvas);
            const ui = uiRoot.addComponent(UITransform);
            ui.setContentSize(new Size(1280, 720));
        }

        let comp = uiRoot.getComponent(GameUI);
        if (!comp) {
            comp = uiRoot.addComponent(GameUI);
            comp._buildDefaultUI(uiRoot);
        }
        return comp;
    }

    private _buildDefaultUI(root: Node) {
        const ballsPanel = new Node('BallsPanel');
        ballsPanel.setParent(root);
        const bpTf = ballsPanel.addComponent(UITransform);
        bpTf.setContentSize(120, 80);
        const bpWidget = ballsPanel.addComponent(Widget);
        bpWidget.isAlignTop = true;
        bpWidget.isAlignLeft = true;
        bpWidget.top = 20;
        bpWidget.left = 20;

        const title = new Node('Title');
        title.setParent(ballsPanel);
        const titleLabel = title.addComponent(Label);
        titleLabel.string = 'Balls';
        titleLabel.fontSize = 22;
        titleLabel.color = Color.WHITE;
        title.setPosition(0, 20, 0);

        const countNode = new Node('BallsCount');
        countNode.setParent(ballsPanel);
        this.ballsLabel = countNode.addComponent(Label);
        this.ballsLabel.string = '0';
        this.ballsLabel.fontSize = 36;
        this.ballsLabel.color = Color.WHITE;
        countNode.setPosition(0, -15, 0);

        this.resultPanel = new Node('ResultPanel');
        this.resultPanel.setParent(root);
        this.resultPanel.active = false;
        const rpTf = this.resultPanel.addComponent(UITransform);
        rpTf.setContentSize(400, 200);

        this.resultLabel = this.resultPanel.addComponent(Label);
        this.resultLabel.string = '';
        this.resultLabel.fontSize = 32;
        this.resultLabel.color = Color.WHITE;

        const retryBtn = new Node('BtnRetry');
        retryBtn.setParent(this.resultPanel);
        retryBtn.setPosition(-80, -60, 0);
        const retryLabel = retryBtn.addComponent(Label);
        retryLabel.string = '重试';
        retryLabel.fontSize = 24;
        retryBtn.on(Node.EventType.TOUCH_END, () => this._onRetry?.());

        const nextBtn = new Node('BtnNext');
        nextBtn.setParent(this.resultPanel);
        nextBtn.setPosition(80, -60, 0);
        const nextLabel = nextBtn.addComponent(Label);
        nextLabel.string = '下一关';
        nextLabel.fontSize = 24;
        nextBtn.on(Node.EventType.TOUCH_END, () => this._onNext?.());
    }

    setCallbacks(onRetry: () => void, onNext: () => void) {
        this._onRetry = onRetry;
        this._onNext = onNext;
    }

    updateBalls(count: number) {
        if (this.ballsLabel) {
            this.ballsLabel.string = String(count);
        }
    }

    showWin() {
        if (this.resultPanel && this.resultLabel) {
            this.resultPanel.active = true;
            this.resultLabel.string = '胜利！';
        }
    }

    showLose() {
        if (this.resultPanel && this.resultLabel) {
            this.resultPanel.active = true;
            this.resultLabel.string = '失败';
        }
    }

    hideResult() {
        if (this.resultPanel) {
            this.resultPanel.active = false;
        }
    }
}
