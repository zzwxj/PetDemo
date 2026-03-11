import { _decorator, Animation, Camera, Component, director, EventMouse, EventTouch, find, geometry, Input, input, Label, math, Node, physics, PhysicsSystem, ProgressBar, randomRange, Touch, Vec3 } from 'cc';
import { Procedural2Controller } from './Procedural2Controller';
import { FollowCameraInput } from '../Camera/FollowCameraInput';
const { ccclass, property } = _decorator;

export enum FoodType {
    NORMAL,   
    SNACK,   
    NUTRITION 
}
export enum TouchPart {
    HEAD,      
    BODY,   
    LEG     
}

export enum AnimationName {
    IDLE = "Idle",
    BORON = "ClickedOn",
    TOUCH_HEAD = "Embarrassed",
    TOUCH_BODY = "Congratulate",
    TOUCH_LEG = "Writing",
    EAT = "Pleased",
    WALK = "Show",
}

@ccclass('PetCore')
export class PetCore extends Component {
    @property()
    hunger: number = 50;
    @property()
    mood: number = 80;
    @property()
    clean: number = 90;
    @property()
    energy: number = 80;
    @property()
    hungerSpeed: number = 1;
    @property()
    energySpeed: number = 0.8;

    // 组件
    @property(Animation)
    petAnim: Animation = null;
    @property(Node)
    loveParticle: Node = null;
    @property(Camera)
    mainCamera:Camera = null;

    // UI
    @property(ProgressBar) 
    hungerBar: ProgressBar = null;
    @property(ProgressBar) 
    moodBar: ProgressBar = null;
    @property(ProgressBar) 
    cleanBar: ProgressBar = null;
    @property(ProgressBar) 
    energyBar: ProgressBar = null;
    @property(Label) 
    hungerLabel: Label = null;
    @property(Label) 
    moodLabel: Label = null;
    @property(Label) 
    cleanLabel: Label = null;
    @property(Label) 
    energyLabel: Label = null;
    @property(Node) 
    dialogBubble: Node = null;
    @property(Label) 
    dialogLabel: Label = null;

    //移动
    @property()
    moveSpeed: number = 0.5;
    @property()
    randomMoveTime: number = 5;
    @property()
    moveRange: number = 3;

    private isIdle: boolean = true;
    private idleTime:number = 0;
    private targetPos: Vec3 = Vec3.ZERO;
    private moveTimer: number = 0;
    private isBad:boolean = false;

    // 对话
    private dialogLib = {
        happy: [
            "再摸咬你一口",
            "还记得十年前你在雪山救下的狐狸吗",
            "今天的零食真好吃！",
            "最喜欢小登了",
            "我是雪山！"
        ],
        hungry: [
            "肚肚宝宝打雷了",
            "小登，老子饿了",
            "要吃饭",
            "再不吃东西要拆家了",
            "吃饱才有力气拆家"
        ],
        tired: [
            "累了累了",
            "走不动了～休息一下再拯救地球",
            "哈~~~~~嗷呜~~~~",
            "该回到神奇宝贝球了",
            "元气耗尽了…"
        ]
    };

    onLoad() {
        this.dialogBubble.active = false;
        this.loveParticle.active = false;

        this.updateStateUI();
        const input = director.getScene().getChildByName("Canvas")?.getComponent(FollowCameraInput);
        input?.AddKfc("Ground",this.onTouchGound.bind(this));
        input?.AddKfc("Head",this.onTouchPetHead.bind(this));
        input?.AddKfc("Body",this.onTouchPetBody.bind(this));
        input?.AddKfc("LFinger",this.onTouchPetLeg.bind(this));
        input?.AddKfc("RFinger",this.onTouchPetLeg.bind(this));
        input?.AddKfc("LAnkle",this.onTouchPetLeg.bind(this));
        input?.AddKfc("RAnkle",this.onTouchPetLeg.bind(this));
    }

    protected onEnable(): void {
        this.targetPos = this.node.worldPosition.clone();
        this.switchState('idle');
        
    }

    update(dt: number) {
        this.updateBaseState(dt);
        this.updateRandomMove(dt);
        this.updateMove(dt);
        this.updateStateMachine();
        this.autoFindShit();
    }

    updateBaseState(dt: number) {
        this.hunger = math.clamp(this.hunger + this.hungerSpeed * dt, 0, 100);
        this.energy = math.clamp(this.energy - this.energySpeed * dt, 0, 100);
        this.updateStateUI();
    }

    updateStateMachine() {
        if(this.isIdle && this.energy > 0 && this.hunger < 100 && this.mood > 0 && this.moveTimer > 3){
            this.switchState('walk');
            return;
        }
        if(this.energy <= 0 || this.hunger >= 100 || this.mood <= 0){
            if(this.isBad)return;
            this.dealWithState();
            this.isBad = true;
            return;
        }else{
            this.isBad = false;
        }
    }

    private _hasshit = false;

    autoFindShit(){
        if(this._hasshit && this.hunger > 0){
            this.targetPos.x = 0;
            this.targetPos.z = 0;
            this.switchState("walk");
        }
    }

    updateMove(dt: number){
        if(this.isIdle)return;
        this.targetPos.y = 1.4;
        const dir = this.targetPos.subtract(this.node.worldPosition);
        if (dir.length() > 0.1 && !this.isIdle) {
            dir.normalize();
            const delta = Vec3.multiplyScalar(new Vec3(), dir, this.moveSpeed * dt);
            this.node.translate(delta, Node.NodeSpace.WORLD);
            Vec3.add(this.targetPos, this.node.worldPosition, dir);
            this.node.lookAt(this.targetPos);
            if(this.node.getComponent(Procedural2Controller)){
                this.node.getComponent(Procedural2Controller)!.dir = dir;
            }
        }
    }

    updateRandomMove(dt: number) {

        this.moveTimer += dt;

        if (this.moveTimer >= this.randomMoveTime) {
            const randomX = randomRange(-this.moveRange, this.moveRange);
            const randomZ = randomRange(-this.moveRange, this.moveRange);
            
            this.targetPos = new Vec3(
                this.node.worldPosition.x + randomX,
                this.node.worldPosition.y,
                this.node.worldPosition.z + randomZ
            );
            if(this.targetPos.x < -3)this.targetPos.x = -3;
            if(this.targetPos.x > 5)this.targetPos.x = 5;
            if(this.targetPos.z < -3)this.targetPos.z = -3;
            if(this.targetPos.z > 5)this.targetPos.z = 5;
            
            this.moveTimer = 0;
        }
        
    }

    dealWithState(){
        if(this.hunger >= 100){
            this.switchState("hungry");
            return false;
        }else if(this.energy <= 0){
            this.switchState("tired");
            return false;
        }else if(this.mood <= 0){
            this.switchState("idle");
            return false;
        }
        return true;
    }

    switchState(state: string) {

        this.isIdle = state != "walk";
        this.petAnim.crossFade(state, 0.2);

        if (state === 'happy') {
            this.petAnim.play(AnimationName.TOUCH_BODY);
            this.showRandomDialog('happy');
        } else if (state === 'hungry') {
            this.petAnim.play(AnimationName.TOUCH_HEAD);
            this.showRandomDialog('hungry');
        } else if (state === 'tired') {
            this.petAnim.play(AnimationName.TOUCH_HEAD);
            this.showRandomDialog('tired');
        } else if( state === 'idle'){
            this.petAnim.play(AnimationName.IDLE);
        } else if( state === 'walk'){
            this.moveTimer = 0;
            this.petAnim.play(AnimationName.WALK);
        }
    }

    updateStateUI() {
        this.hungerBar.progress = this.hunger / 100;
        this.moodBar.progress = this.mood / 100;
        this.cleanBar.progress = this.clean / 100;
        this.energyBar.progress = this.energy / 100;

        this.hungerLabel.string = Math.floor(this.hunger).toString();
        this.moodLabel.string = Math.floor(this.mood).toString();
        this.cleanLabel.string = Math.floor(this.clean).toString();
        this.energyLabel.string = Math.floor(this.energy).toString();
    }

    feedPet() {
        this.switchState('eat');

        //
        this.hunger -= 35;
        this.mood += 10;
        this.energy += 20;
        this.clean += 5;
            
        
        this.hunger = math.clamp(this.hunger, 0, 100);
        this.mood = math.clamp(this.mood, 0, 100);
        this.energy = math.clamp(this.energy, 0, 100);
        this.clean = math.clamp(this.clean, 0, 100);

        this.updateStateUI();
    }

    testFeed(){
        this.feedPet();
    }

    onTouchPetHead(pos){this.touchPet(TouchPart.HEAD)};
    onTouchPetBody(pos){this.touchPet(TouchPart.BODY)};
    onTouchPetLeg(pos){this.touchPet(TouchPart.LEG)};

    touchPet(part: TouchPart) {
        this.isIdle = true;
        switch (part) {
            case TouchPart.HEAD:
                this.petAnim.play(AnimationName.TOUCH_HEAD);
                this.mood += 8;
                break;
            case TouchPart.BODY:
                this.petAnim.play(AnimationName.TOUCH_BODY);
                this.mood += 5;
                break;
            case TouchPart.LEG:
                this.petAnim.play(AnimationName.TOUCH_LEG);
                this.mood += 3;
                break;
        }

        this.mood = math.clamp(this.mood, 0, 100);
        this.updateStateUI();

        this.showLoveParticle(part);
        this.showRandomDialog('happy');
    }

    showLoveParticle(part: TouchPart) {
        if(this.loveParticle.active)return;
        this.loveParticle.active = true;
        setTimeout(() => {
            this.loveParticle.active = false;
        }, 2000);
    }

    showRandomDialog(type: string) {
        const dialogList = this.dialogLib[type as keyof typeof this.dialogLib];
        if (!dialogList) return;

        const randomIdx = Math.floor(randomRange(0, dialogList.length));
        const content = dialogList[randomIdx];
        
        this.showDialogText(content);
    }

    showDialogText(content: string) {
        if(this.dialogBubble.active)return;
        this.dialogBubble.active = true;
        this.dialogLabel.string = "";

        let index = 0;
        const showChar = () => {
            if (index < content.length) {
                this.dialogLabel.string += content.charAt(index);
                index++;
                setTimeout(showChar, 80);
            } else {
                setTimeout(() => {
                    this.dialogBubble.active = false;
                }, 3000);
            }
        };
        showChar();
    }

    onTouchGound(pos:Vec3){
        if(!this.dealWithState())return;
        this.switchState('walk');
        if(pos.x < -4 || pos.x > 6 || pos.z < -4 || pos.z > 6)return;
        this.targetPos.x = pos.x;
        this.targetPos.z = pos.z;
        this.moveTimer = 0;
    }

    cleanPet() {
        this.clean = 100;
        this.mood += 5;
        this.updateStateUI();
    }
}


