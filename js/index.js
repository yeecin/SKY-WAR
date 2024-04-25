//获取屏幕宽度和高度，判断是否大于背景图片的宽度和高度，如果不大于则设置背景图片的宽度和高度为屏幕的宽度和高度
let viewWidth = document.body.clientWidth > 480 ? 480 : document.body.clientWidth;
let viewHeight = document.body.clientHeight > 700 ? 700 : document.body.clientHeight;
//获取DPR设置分辨率
const dpr = window.devicePixelRatio;

//创建场景，场景1（开始界面，初始化游戏）
class InitScene extends Phaser.Scene {
    //构造函数
    constructor() {
        super({ key: 'InitScene' })
    }
    //开始按钮
    startButton = null;
    //预加载
    preload() {
        this.load.image('background', 'assets/imgs/background.png')
        this.load.image('startBtn', 'assets/imgs/start_btn.png')
    }
    //创建
    create() {
        //设置缩放让背景拉伸铺满全屏
         this.add.image(viewWidth / 2, viewHeight / 2, 'background').setScale(viewWidth / 400, viewHeight / 700)
         this.startBtn = this.add.sprite(viewWidth / 2, viewHeight / 2 + 140, 'startBtn').setInteractive().setScale(.5)
        // 绑定开始按钮事件
        this.startBtn.on('pointerup', function () {
            game.scene.start('GameScene') // 启动游戏中场景，后面会创建
            game.scene.sleep('InitScene') // 使当前场景睡眠
        })
    }
    update() { }
}
//创建场景，场景2（游戏中）
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' })
    }
    // 只要是给当前类设置的属性并且值为 null，则会在下面 create 中进行初始化
    // phaser 内置键盘管理器
    cursors = null
    // 游戏背景
    bg = null
    // 我方飞机子弹对象池
    myBullets = null
    initData() {
        this.isGameOver = false // 判断游戏是否结束
        // 我方飞机子弹连发数量
        this.myBulletQuantity = 1
        // 记分
        this.score = 0
        this.scoreText?.setText('Score: ' + this.score)
        // 判断鼠标或手指是否在我方飞机上按下屏幕
        this.draw = false
        // 给场景绑定鼠标或手指移动事件，如果按下我放飞机并移动则使飞机跟随指针移动
        this.input.on('pointermove', pointer => {
            if (this.draw) {
                this.player.x = this.x + pointer.x - pointer.downX
                this.player.y = this.y + pointer.y - pointer.downY
            }
        })
        
        // 我方飞机x，y(非实时，用于拖拽和初始化使用，获取实时直接player.x/player.y)
        this.x = viewWidth / 2
        this.y = viewHeight - 200
        // 游戏运行全局速度控制
        this.speed = 0.4
    }
    preload() {
        this.load.image('gameBG', 'assets/imgs/background.png')
        this.load.spritesheet('player', 'assets/imgs/player.png', { frameWidth: 95, frameHeight: 112 })
        this.load.image('myBullet', 'assets/imgs/bullet.png')
        this.load.spritesheet('smallPlane', 'assets/imgs/enemy_small.png', { frameWidth: 52, frameHeight: 45 })
        this.load.spritesheet('midPlane', 'assets/imgs/enemy_mid.png', { frameWidth: 78, frameHeight: 86 })
        // this.load.image('enemyBullet', 'assets/imgs/bullet.png')
    }
    create() {
        this.initData()
        // 初始化 phaser 内置键盘管理器
        this.cursors = this.input.keyboard.createCursorKeys()
        // 使用 tileSprite 添加背景，在 update 函数中 y 值自减使背景无限滚动
        this.bg = this.add.tileSprite(viewWidth / 2, viewHeight / 2, viewWidth, viewHeight, 'gameBG')
        // 创建我飞机精灵并开启交互
        this.player = this.physics.add.sprite(this.x, this.y, 'player').setInteractive()
        // 设置世界边界防止我方飞机飞出屏幕
        this.player.setCollideWorldBounds(true)
        // 重力设置与 config 中一致，飞机大战游戏我方飞机不需要重力
        this.player.body.setGravityY(0)
        // 初始化我方飞机子弹对象池
        this.myBullets = this.physics.add.group()
        
        // 自动发射子弹，this.time.addEvent 类似 js 定时器，不过它是跟随场景的，场景暂停或停止，它也会跟随暂停或停止
        this.time.addEvent({
            delay: 260, // 调用间隔
            loop: true, // 是否循环调用
            callback: () => { // 被执行的回调函数
                // 创建子弹，createMyBullet 方法在下面创建
                this.createMyBullet() 
            }
        })
        // 创建我方飞机正常游戏动画
        this.anims.create({
            key: 'playerfly',
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 1 }),
            frameRate: 8,
            repeat: -1
        })
        // 创建我方飞机爆炸动画
        this.anims.create({
            key: 'playerboom',
            frames: this.anims.generateFrameNumbers('player', { start: 2, end: 5 }),
            frameRate: 8,
        })
        // 创建敌方飞机对象池
        this.enemyPlanes1 = this.physics.add.group()
        this.enemyPlanes2 = this.physics.add.group()
        // 敌方小飞机正常游戏动画
        this.anims.create({
            key: 'smallPlaneRun',
            frames: [ { key: 'smallPlane', frame: 0 } ],
            frameRate: 8
        })
        // 敌方小飞机爆炸动画
        this.anims.create({
            key: 'smallPlaneBoom',
            frames: this.anims.generateFrameNumbers('smallPlane', { start: 1, end: 5 }),
            frameRate: 32,
        })
        // 敌方中飞机正常游戏动画
        this.anims.create({
            key: 'midPlaneRun',
            frames: [ { key: 'midPlane', frame: 0 } ],
            frameRate: 8
        })
        // 敌方中飞机爆炸动画
        this.anims.create({
            key: 'midPlaneBoom',
            frames: this.anims.generateFrameNumbers('midPlane', { start: 1, end: 5 }),//因为没做动画，所以就都这样吧
            frameRate: 32,
        })
        // 将鼠标或手指按下事件绑定给我方飞机
        this.player.on('pointerdown', () => {
            this.draw = true
            this.x = this.player.x
            this.y = this.player.y
        })
        // 将鼠标或手指抬起事件绑定给场景
        this.input.on('pointerup', () => {
            this.draw = false
        })
        // 我方子弹与敌机碰撞检测，有三种敌方飞机，只需要将我方子弹与这三个敌方飞机对象池设置碰撞检测即可，
        // 其中 enemyAndMyBulletCollision 为碰撞回调函数 enemyPlanes1/2/3 为三种敌机对象池
        this.physics.add.overlap(this.myBullets, this.enemyPlanes1, this.enemyAndMyBulletCollision, null, this)
        this.physics.add.overlap(this.myBullets, this.enemyPlanes2, this.enemyAndMyBulletCollision, null, this)
        // this.physics.add.overlap(this.myBullets, this.enemyPlanes3, this.enemyAndMyBulletCollision, null, this)
        // 地方飞机与我方飞机碰撞检测
        this.physics.add.overlap(this.player, this.enemyPlanes1, this.enemyAndMyPlaneCollision, null, this)
        //流水线启动
        this.productionLineRun()
        //计分
        this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '28px', fill: '#000' })
        this.scoreText.depth = 99
    }
    update() {
        if (this.isGameOver) {
            // game over 播放我方飞机爆炸动画
            this.player.anims.play('playerboom', true)
        } else {
            // 背景无限滚动
            this.bg.tilePositionY -= this.speed
            // 播放我放飞机正常动画
            this.player.anims.play('playerfly', true)
            // 键盘控制我方飞机移动
            if (this.cursors.left.isDown) {
                this.player.setVelocityX(-260)
            } else if (this.cursors.right.isDown) {
                this.player.setVelocityX(260)
            } else {
                this.player.setVelocityX(0)
            }
            if (this.cursors.up.isDown) {
                this.player.setVelocityY(-260)
            } else if (this.cursors.down.isDown) {
                this.player.setVelocityY(260)
            } else {
                this.player.setVelocityY(0)
            }
        }
        // 我方飞机子弹对象池子弹边界检测，使用 killAndHide 进行复用提高性能
        this.myBullets.getChildren().forEach(item => {
            if (item.active && item.y < -item.height) {
                this.myBullets.killAndHide(item)
            }
        })
        // 敌方飞机对象池边界检测，使用killAndHide进行复用提高性能
        this.enemyPlanes1.getChildren().forEach(item => {
            if (item.active && item.y > viewHeight + item.height) {
                this.enemyPlanes1.killAndHide(item)
            }
        })
        this.enemyPlanes2.getChildren().forEach(item => {
            if (item.active && item.y > viewHeight + item.height) {
                this.enemyPlanes2.killAndHide(item)
            }
        })
        // this.enemyPlanes3.getChildren().forEach(item => {
        //     if (item.active && item.y > viewHeight + item.height) {
        //         this.enemyPlanes3.killAndHide(item)
        //     }

    }

    // 生成我方飞机子弹
    createMyBullet() {
        // 动态子弹连发x坐标处理
        for (let i = 0; i < this.myBulletQuantity; i++) {
            // 这里的 x 坐标判断主要实现子弹创建时数量不论多少都能在我方飞机上面均匀排列发射
            let x = 
                i < this.myBulletQuantity / 2
                ? 
                (
                    this.myBulletQuantity % 2 != 0 && i > this.myBulletQuantity / 2 - 1
                    ?
                    this.player.x
                    :
                    this.player.x - ((this.myBulletQuantity - i - this.myBulletQuantity / 2 - (this.myBulletQuantity % 2 != 0 ? 0.5 : 0)) * 20)
                )
                :
                this.player.x + (i - this.myBulletQuantity / 2 + (this.myBulletQuantity % 2 != 0 ? 0.5 : 1)) * 20
            // 从对象池取子弹，如果对象池没有则会创建一个
            const tmpMyBullet = this.myBullets.get(x, this.player.y - this.player.height / 2 + 10, 'myBullet')
            tmpMyBullet.name = 'myBullet' // 子弹的名字
            tmpMyBullet.setVelocity(0, -600) // 设置速度，x 不变， y 值 -500 使子弹往上发射
            // tmpMyBullet.setScale(0.6, 1) //  x 缩放，看起来好看点
            tmpMyBullet.setActive(true)
            tmpMyBullet.setVisible(true)
            /* 创建子弹后设置 active 和 visible 是 true 是因为下面马上会设置子弹边界检测，
                超出屏幕或者碰撞到敌机时会使子弹消失，使用的是 killAndHide（killAndHide 不会销毁对象，
                而是将active 和 visible 改为 false，供对象池下次 get 使用），而不是 destroy，
                这样子弹每次创建时都会去对象池找没有工作的对象，从而进行复用，
                不断销毁和创建会很浪费性能，后续敌方飞机和道具也会使用这种方式 
            */
        }
    }
    // 流水线作坊开始运作
    productionLineRun() {
        this.productionLineRunTimer = this.time.addEvent({
            delay: 2000,
            loop: true,
            callback: () => {
                // 敌机生产
                this.speed = this.speed >= 1.8 ? 1.8 : this.speed + 0.05
                this.enemyTimer?.destroy()
                this.enemyTimer = this.time.addEvent({
                    delay: 700 - this.speed * 280,
                    loop: true,
                    callback: () => {
                        //暂时只生成小飞机
                        let index = Math.floor(Math.random() * 8)
                        if (index < 4) {
                            this.createEnemySmallPlane()
                        } else if (index >= 4 && index < 6) {
                            // this.createEnemySmallPlane()
                            this.createEnemyMidPlane()
                        } else {
                            this.createEnemySmallPlane()
                            // this.createEnemyBigPlane()
                        }
                    }
                })
            }
        })
    }
    // 生成敌方小飞机
    createEnemySmallPlane() {
        let x = 17 + Math.ceil(Math.random() * (viewWidth - 34))
        let y = -12
        const tmpenemyPlane = this.enemyPlanes1.get(x, y, 'smallPlane')
        tmpenemyPlane.name = 'smallPlane'
        tmpenemyPlane.hp = 1
        tmpenemyPlane.setVelocity(0, this.speed / 4 * 10 * 60)
        tmpenemyPlane.setActive(true)
        tmpenemyPlane.setVisible(true)
        tmpenemyPlane.anims.play('smallPlaneRun')
    }
    // 生成敌方中飞机
    createEnemyMidPlane() {
        let x = 17 + Math.ceil(Math.random() * (viewWidth - 34))
        let y = -12
        const tmpenemyPlane = this.enemyPlanes2.get(x, y, 'midPlane')
        tmpenemyPlane.name = 'midPlane'
        tmpenemyPlane.hp = 3
        tmpenemyPlane.setVelocity(0, this.speed / 4 * 10 * 60)
        tmpenemyPlane.setActive(true)
        tmpenemyPlane.setVisible(true)
        tmpenemyPlane.anims.play('midPlaneRun')
    }
    // 我方子弹与敌机碰撞检测
    enemyAndMyBulletCollision(myBullet, enemyPlane) {
        // 该回调函数在碰撞时只要对象没销毁就会多次触发，所以这里使用 active 判断对象是否存在屏幕
        if (myBullet.active && enemyPlane.active) {
            // 判断敌机名字处理挨打，爆炸动画
            let animNames = []
            let enemyPlanes = null
            switch (enemyPlane.name) {
                // case 'bigPlane':
                //     animNames = ['', 'bigPlaneBoom']
                //     enemyPlanes = this.enemyPlanes3
                //     break
                case 'midPlane':
                    animNames = ['', 'midPlaneBoom']
                    enemyPlanes = this.enemyPlanes2
                    break
                case 'smallPlane':
                    animNames = ['', 'smallPlaneBoom']
                    enemyPlanes = this.enemyPlanes1
                    break
                default:
                    break
            }
            enemyPlane.hp -= 1 // 1发子弹减少1滴血，初始化时小飞机，中飞机，大飞机血量分别是1，3，5
            // 显示敌机挨打动画
            if (enemyPlane.hp > 0) {
                enemyPlane.anims.play(animNames[0])
            }
            // 血量没了显示敌机爆炸动画，0.18s后消失，也就是有0.18s的爆炸动画
            if (enemyPlane.hp == 0) {
                enemyPlane.anims.play(animNames[1]) // 播放爆炸动画
                enemyPlane.setVelocity(0, 0) // 血量没了显示爆炸动画期间不再继续往下移动
                setTimeout(() => {
                    enemyPlanes.killAndHide(enemyPlane)
                }, 180)
                //判断是什么类型的飞机，小飞机加1分，中飞机加3分，大飞机加5分
                this.score += enemyPlane.name == 'smallPlane' ? 1 : 3
                this.scoreText.setText('Score: ' + this.score)
                // this.score += 1
                // this.scoreText.setText('Score: ' + this.score)
            }
            // 防止敌机在爆炸动画中也会使子弹消失
            if (enemyPlane.hp >= 0) {
                this.myBullets.killAndHide(myBullet)
            }
        }
    }
    // 敌机与我方飞机碰撞检测
    enemyAndMyPlaneCollision(myPlane, enemyPlane) {
        if (enemyPlane.hp > 0 && enemyPlane.active) {
            this.isGameOver = true
            this.productionLineRunTimer.destroy()
            this.enemyTimer?.destroy()
            this.physics.pause()
            this.input.off('pointermove')
            let startBtn = this.add.sprite(viewWidth / 2, viewHeight / 2, 'startBtn').setInteractive().setScale(.5)
            startBtn.on('pointerup', () => {
                startBtn.destroy()
                this.initData()
                this.myBullets.getChildren().forEach(item => {
                    this.myBullets.killAndHide(item)
                })
                this.enemyPlanes1.getChildren().forEach(item => {
                    this.enemyPlanes1.killAndHide(item)
                })
                this.enemyPlanes2.getChildren().forEach(item => {
                    this.enemyPlanes2.killAndHide(item)
                })
                // this.enemyPlanes3.getChildren().forEach(item => {
                //     this.enemyPlanes3.killAndHide(item)
                // })
                this.player.x = this.x
                this.player.y = this.y
                this.productionLineRun()
                this.physics.resume()
            })
        }
    }

}

const config = {
    type: Phaser.AUTO, // Phaser 检测浏览器支持情况自行选择使用 webGL 还是 Canvas 进行绘制
    width: viewWidth,
    height: viewHeight,
    antialias: true, // 抗锯齿
    zoom: 0.99999999, // 缩放
    resolution: dpr || 1, // 分辨率
    physics: { // 物理系统
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }, // y 重力
            debug: false
        }
    },
    scene: [InitScene,GameScene], // 场景
}
const game = new Phaser.Game(config)