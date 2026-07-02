import {
    _decorator,
    Component,
    Node,
    Camera,
    Vec3,
    screen,
    Canvas,
    UITransform,
    Widget,
    Label,
    Color,
    Size,
} from 'cc';
import { ObjectTypeRegistry } from './game/ObjectTypeRegistry';
import { LevelLoader, LevelBounds } from './game/LevelLoader';

const { ccclass, property } = _decorator;

/** 场景入口：加载关卡模型并让相机自动取景 */
@ccclass('Main')
export class Main extends Component {
    @property({ tooltip: '起始关卡号' })
    levelIndex = 1;

    start() {
        this._buildLevel().catch((e) => {
            console.error('[Main] 关卡生成失败', e);
            this._showFatalError('Main.start', e);
        });
    }

    /** 加载关卡模型并将其纳入相机视野 */
    private async _buildLevel() {
        const registry = new ObjectTypeRegistry();
        await registry.init();

        const levelRoot = new Node('LevelRoot');
        levelRoot.setParent(this.node.scene);

        const loader = new LevelLoader(registry);
        const result = await loader.loadLevel(this.levelIndex, levelRoot);

        this._frameCamera(result.bounds);
        console.log(`[Main] 关卡 ${this.levelIndex} 模型生成完成`, result.bounds);
    }

    /** 根据关卡包围盒自动摆放相机，保证模型完整落在视野内 */
    private _frameCamera(bounds: LevelBounds) {
        const camNode = this.node.scene?.getChildByName('Main Camera');
        const cam = camNode?.getComponent(Camera);
        if (!camNode || !cam) {
            console.warn('[Main] 未找到 Main Camera，跳过自动取景');
            return;
        }

        const center = new Vec3(
            (bounds.min.x + bounds.max.x) * 0.5,
            (bounds.min.y + bounds.max.y) * 0.5,
            (bounds.min.z + bounds.max.z) * 0.5,
        );
        const extent = new Vec3(
            (bounds.max.x - bounds.min.x) * 0.5,
            (bounds.max.y - bounds.min.y) * 0.5,
            (bounds.max.z - bounds.min.z) * 0.5,
        );
        const radius = Math.max(0.5, extent.length());

        // 取水平/垂直 FOV 中较小者做保守估算，避免宽高比导致某个方向裁切
        const winSize = screen.windowSize;
        const aspect = winSize.width > 0 && winSize.height > 0 ? winSize.width / winSize.height : 9 / 16;
        const vFovRad = (cam.fov * Math.PI) / 180;
        const hFovRad = 2 * Math.atan(Math.tan(vFovRad * 0.5) * aspect);
        const halfFov = Math.min(vFovRad, hFovRad) * 0.5;

        const margin = 1.25; // 预留边距，避免模型贴边
        const distance = (radius * margin) / Math.sin(halfFov);

        // 相机从关卡斜前下方后退取景，与原始机位朝向保持一致
        const dir = new Vec3(0, -0.2, -1).normalize();
        const camPos = new Vec3(
            center.x + dir.x * distance,
            center.y + dir.y * distance,
            center.z + dir.z * distance,
        );

        camNode.setWorldPosition(camPos);
        camNode.lookAt(center);
        cam.far = Math.max(cam.far, distance + radius * 2 + 10);
    }

    /** 把致命错误直接画到屏幕上（不依赖其它 UI，尽量少用可能出错的 API） */
    private _showFatalError(where: string, e: unknown) {
        try {
            const scene = this.node.scene;
            if (!scene) {
                return;
            }

            let canvas = scene.getChildByName('FatalErrorCanvas');
            if (!canvas) {
                canvas = new Node('FatalErrorCanvas');
                canvas.setParent(scene);
                canvas.addComponent(UITransform).setContentSize(new Size(1280, 720));
                canvas.addComponent(Canvas);
            }

            const labelNode = new Node('FatalErrorLabel');
            labelNode.setParent(canvas);
            labelNode.addComponent(UITransform).setContentSize(1000, 600);
            const widget = labelNode.addComponent(Widget);
            widget.isAlignHorizontalCenter = true;
            widget.isAlignVerticalCenter = true;

            const label = labelNode.addComponent(Label);
            label.fontSize = 22;
            label.color = new Color(255, 60, 60, 255);
            const message = e instanceof Error ? `${e.message}\n${e.stack ?? ''}` : String(e);
            label.string = `[${where} 启动失败]\n${message}`;
        } catch (inner) {
            console.error('[Main] 显示错误信息也失败了', inner);
        }
    }
}
