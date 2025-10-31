const { Engine, Render, Runner, World, Bodies, Body, Constraint, Events, Composite } = Matter;

class HillClimbGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
        
        this.engine = Engine.create();
        this.world = this.engine.world;
        this.world.gravity.y = 1;
        
        this.runner = Runner.create();
        
        this.vehicle = null;
        this.terrain = [];
        this.terrainBodies = [];
        this.fuel = 100;
        this.maxFuel = 100;
        this.distance = 0;
        this.gameOver = false;
        this.keys = {};
        
        this.cameraX = 0;
        this.terrainSegmentWidth = 100;
        this.lastTerrainX = 0;
        
        this.init();
    }
    
    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        });
    }
    
    init() {
        this.generateInitialTerrain();
        this.createVehicle(200, 100);
        this.setupControls();
        
        Runner.run(this.runner, this.engine);
        
        Events.on(this.engine, 'beforeUpdate', () => this.update());
        
        this.render();
    }
    
    generateInitialTerrain() {
        const segments = 30;
        for (let i = 0; i < segments; i++) {
            this.addTerrainSegment();
        }
    }
    
    addTerrainSegment() {
        const x = this.lastTerrainX;
        const baseY = 400;
        
        let y;
        if (this.terrain.length === 0) {
            y = baseY;
        } else {
            const lastY = this.terrain[this.terrain.length - 1].y;
            const variation = (Math.random() - 0.5) * 150;
            y = Math.max(200, Math.min(500, lastY + variation));
        }
        
        this.terrain.push({ x, y });
        
        if (this.terrain.length > 1) {
            const prev = this.terrain[this.terrain.length - 2];
            const curr = this.terrain[this.terrain.length - 1];
            
            const angle = Math.atan2(curr.y - prev.y, curr.x - prev.x);
            const length = Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2));
            const centerX = (prev.x + curr.x) / 2;
            const centerY = (prev.y + curr.y) / 2;
            
            const ground = Bodies.rectangle(centerX, centerY + 50, length, 100, {
                isStatic: true,
                angle: angle,
                friction: 0.8,
                render: {
                    fillStyle: '#8B4513'
                }
            });
            
            World.add(this.world, ground);
            this.terrainBodies.push(ground);
        }
        
        this.lastTerrainX += this.terrainSegmentWidth;
    }
    
    createVehicle(x, y) {
        const carBody = Bodies.rectangle(x, y, 80, 30, {
            density: 0.002,
            friction: 0.8,
            render: {
                fillStyle: '#FF4444'
            }
        });
        
        const wheelRadius = 20;
        const wheelOptions = {
            density: 0.004,
            friction: 1.5,
            restitution: 0.5,
            render: {
                fillStyle: '#333333'
            }
        };
        
        const frontWheel = Bodies.circle(x + 30, y + 25, wheelRadius, wheelOptions);
        const rearWheel = Bodies.circle(x - 30, y + 25, wheelRadius, wheelOptions);
        
        const frontSuspension = Constraint.create({
            bodyA: carBody,
            pointA: { x: 30, y: 15 },
            bodyB: frontWheel,
            stiffness: 0.5,
            damping: 0.1,
            length: 10
        });
        
        const rearSuspension = Constraint.create({
            bodyA: carBody,
            pointA: { x: -30, y: 15 },
            bodyB: rearWheel,
            stiffness: 0.5,
            damping: 0.1,
            length: 10
        });
        
        this.vehicle = {
            body: carBody,
            frontWheel: frontWheel,
            rearWheel: rearWheel,
            frontSuspension: frontSuspension,
            rearSuspension: rearSuspension
        };
        
        World.add(this.world, [
            carBody,
            frontWheel,
            rearWheel,
            frontSuspension,
            rearSuspension
        ]);
    }
    
    setupControls() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
        
        const gasBtn = document.getElementById('gasBtn');
        const brakeBtn = document.getElementById('brakeBtn');
        
        gasBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.keys['ArrowRight'] = true;
        });
        gasBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.keys['ArrowRight'] = false;
        });
        gasBtn.addEventListener('mousedown', () => {
            this.keys['ArrowRight'] = true;
        });
        gasBtn.addEventListener('mouseup', () => {
            this.keys['ArrowRight'] = false;
        });
        
        brakeBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.keys['ArrowLeft'] = true;
        });
        brakeBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.keys['ArrowLeft'] = false;
        });
        brakeBtn.addEventListener('mousedown', () => {
            this.keys['ArrowLeft'] = true;
        });
        brakeBtn.addEventListener('mouseup', () => {
            this.keys['ArrowLeft'] = false;
        });
        
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restart();
        });
    }
    
    update() {
        if (this.gameOver) return;
        
        const torque = 0.002;
        
        if (this.keys['ArrowRight'] && this.fuel > 0) {
            Body.setAngularVelocity(this.vehicle.frontWheel, 0.2);
            Body.setAngularVelocity(this.vehicle.rearWheel, 0.2);
            this.fuel -= 0.05;
        }
        
        if (this.keys['ArrowLeft']) {
            Body.setAngularVelocity(this.vehicle.frontWheel, -0.1);
            Body.setAngularVelocity(this.vehicle.rearWheel, -0.1);
        }
        
        this.distance = Math.max(0, Math.floor((this.vehicle.body.position.x - 200) / 10));
        
        this.cameraX = this.vehicle.body.position.x - this.canvas.width / 3;
        
        if (this.vehicle.body.position.x > this.lastTerrainX - 1000) {
            this.addTerrainSegment();
        }
        
        const oldBodies = this.terrainBodies.filter(body => 
            body.position.x < this.cameraX - 500
        );
        oldBodies.forEach(body => {
            World.remove(this.world, body);
        });
        this.terrainBodies = this.terrainBodies.filter(body => 
            body.position.x >= this.cameraX - 500
        );
        
        const angle = Math.abs(this.vehicle.body.angle);
        if (angle > Math.PI / 2 && angle < Math.PI * 1.5) {
            if (this.vehicle.body.position.y > 100) {
                this.endGame();
            }
        }
        
        if (this.fuel <= 0) {
            this.endGame();
        }
        
        this.updateHUD();
    }
    
    updateHUD() {
        document.getElementById('distance').textContent = this.distance + 'm';
        const fuelPercent = Math.max(0, (this.fuel / this.maxFuel) * 100);
        document.getElementById('fuelBar').style.width = fuelPercent + '%';
        
        if (fuelPercent < 20) {
            document.getElementById('fuelBar').style.backgroundColor = '#ff4444';
        } else if (fuelPercent < 50) {
            document.getElementById('fuelBar').style.backgroundColor = '#ffaa00';
        } else {
            document.getElementById('fuelBar').style.backgroundColor = '#44ff44';
        }
    }
    
    endGame() {
        this.gameOver = true;
        document.getElementById('finalDistance').textContent = this.distance;
        document.getElementById('gameOver').classList.add('show');
    }
    
    restart() {
        World.clear(this.world);
        Engine.clear(this.engine);
        
        this.terrain = [];
        this.terrainBodies = [];
        this.fuel = 100;
        this.distance = 0;
        this.gameOver = false;
        this.cameraX = 0;
        this.lastTerrainX = 0;
        this.keys = {};
        
        document.getElementById('gameOver').classList.remove('show');
        
        this.init();
    }
    
    render() {
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        this.ctx.translate(-this.cameraX, 0);
        
        this.ctx.fillStyle = '#8B4513';
        this.ctx.strokeStyle = '#654321';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        
        if (this.terrain.length > 0) {
            this.ctx.moveTo(this.terrain[0].x, this.terrain[0].y);
            for (let i = 1; i < this.terrain.length; i++) {
                this.ctx.lineTo(this.terrain[i].x, this.terrain[i].y);
            }
            this.ctx.lineTo(this.terrain[this.terrain.length - 1].x, this.canvas.height);
            this.ctx.lineTo(this.terrain[0].x, this.canvas.height);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
        }
        
        const bodies = Composite.allBodies(this.world);
        bodies.forEach(body => {
            if (body.isStatic) return;
            
            this.ctx.save();
            this.ctx.translate(body.position.x, body.position.y);
            this.ctx.rotate(body.angle);
            
            if (body.circleRadius) {
                this.ctx.beginPath();
                this.ctx.arc(0, 0, body.circleRadius, 0, Math.PI * 2);
                this.ctx.fillStyle = '#333333';
                this.ctx.fill();
                this.ctx.strokeStyle = '#666666';
                this.ctx.lineWidth = 3;
                this.ctx.stroke();
                
                this.ctx.beginPath();
                this.ctx.moveTo(0, 0);
                this.ctx.lineTo(body.circleRadius, 0);
                this.ctx.strokeStyle = '#999999';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            } else {
                const vertices = body.vertices;
                this.ctx.beginPath();
                this.ctx.moveTo(
                    vertices[0].x - body.position.x,
                    vertices[0].y - body.position.y
                );
                for (let i = 1; i < vertices.length; i++) {
                    this.ctx.lineTo(
                        vertices[i].x - body.position.x,
                        vertices[i].y - body.position.y
                    );
                }
                this.ctx.closePath();
                this.ctx.fillStyle = '#FF4444';
                this.ctx.fill();
                this.ctx.strokeStyle = '#CC0000';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }
            
            this.ctx.restore();
        });
        
        this.ctx.restore();
        
        requestAnimationFrame(() => this.render());
    }
}

window.addEventListener('load', () => {
    new HillClimbGame();
});
