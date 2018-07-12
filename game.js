'use strict';

class Vector{
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    plus(item) {
        if (!(item instanceof Vector)) {
            throw new Error("Можно прибавлять к вектору только вектор типа Vector");
        }
        const x = item.x + this.x;
        const y = item.y + this.y;
        return new Vector(x, y);
    }
    times(number) {
        const x = this.x*number;
        const y = this.y*number;
        return new Vector(x, y);
    }
}

class Actor{
    constructor(pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
        if (!(pos instanceof Vector) || !(size instanceof Vector) || !(speed instanceof Vector)){
            throw new Error("Можно передавать только вектор типа Vector");
        }
        this.pos = pos;
        this.size = size;
        this.speed = speed;
    }
    act() {}
    get left() {
        return this.pos.x;
    }
    get top() {
        return this.pos.y;
    }
    get right() {
        return this.pos.x + this.size.x;
    }
    get bottom() {
        return this.pos.y + this.size.y;
    }
    get type() {
        return 'actor';
    }
    isIntersect(item) {
        if (!(item  instanceof Actor)) {
            throw new Error("Можно передавать только объект типа Actor");
        }
        if (item === this) {
            return false;
        }
        if (this.top >= item.bottom || this.bottom <= item.top || this.left >= item.right || this.right <= item.left) {
            return false;
        } else {
            return true;
        }
    }
}

class Level{
    constructor(grid = [], actors = []) {
        this.grid = grid;
        this.actors = actors;
        this.player = this.actors.find((el) => {
            return el.type === 'player';
        });
        if (this.grid === []){
            this.height = 0;
        } else {
            this.height = this.grid.length;
        }
        if (this.grid === []) {
            this.width = 0;
        } else {
            let len = this.grid.map(item => item.length);
            let width = Math.max(...len);
            this.width =  width > 0 ? width : 0;
        }
        this.status = null;
        this.finishDelay = 1;
    }

    isFinished() {
        return (this.status !== null && this.finishDelay < 0);
    }

    actorAt(item) {
        if (!(item instanceof Actor)) {
            throw new Error("Можно передавать только объект типа Actor");
        }
        return this.actors.find((el) => {
            return el.isIntersect(item);
        });
    }
    obstacleAt(pos, size){
        if (!(pos instanceof Vector) || !(size instanceof Vector)){
            throw new Error("Можно передавать только вектор типа Vector");
        }
        const item = new Actor(pos, size);
        if (item.top < 0 || item.left < 0 || item.right > this.width) {
            return 'wall';
        }
        if (item.bottom > this.height) {
            return 'lava';
        }
        for (let i = Math.floor(item.top); i < Math.ceil(item.bottom); i++) {
            for (let j = Math.floor(item.left); j < Math.ceil(item.right); j++) {
                if (this.grid[i][j]) {
                    return this.grid[i][j];
                }
            }
        }
    }
    removeActor(item) {
        const index = this.actors.indexOf(item);
        this.actors.splice(index, 1);
    }
    noMoreActors(item) {
        return !(this.actors.some((actor) => {
            return actor.type === item;
        }));
    }
    playerTouched(objType, obj = {}) {
        if (objType === 'lava' || objType === 'fireball') {
            this.status = 'lost';
        } else if (objType === 'coin' && obj.type === 'coin') {
            this.removeActor(obj);
            if (this.noMoreActors('coin')) {
                this.status = 'won';
            }
        }
    }
}

class LevelParser {
    constructor(dictionary = {}) {
        this.dictionary = dictionary;
    }
    actorFromSymbol(sym){
        if (this.dictionary[sym])
            return this.dictionary[sym];
        else
            return undefined;
    }
    obstacleFromSymbol(sym){
        if (sym === 'x')
            return 'wall';
        if(sym === '!')
            return 'lava';
        else
            return undefined;
    }
    createGrid(strs = []) {
        return strs.map((item) => {
            return item.split('').map((el) => {
                return this.obstacleFromSymbol(el);
            });
        });
    }
    createActors(strs = []) {
        const result = [];
        for (let i = 0; i < strs.length; i++) {
            for (let j = 0; j < strs[i].length; j++) {
                const item = this.dictionary[strs[i][j]];
                if (typeof(item) !== 'function') {
                    continue;
                }
                const newObj = new item(new Vector(j, i));
                if (newObj instanceof Actor) {
                    result.push(newObj);
                }
            }
        }
        return result;
    }
    parse(strs = []){
        const grid = this.createGrid(strs);
        const obj = this.createActors(strs);
        return(new Level(grid, obj));
    }
}

class Fireball extends Actor {
    constructor(pos = new Vector(0, 0), speed = new Vector(0, 0), size = new Vector(1, 1)) {
        super(pos, size, speed);
    }

    get type() {
        return 'fireball';
    }

    getNextPosition(time = 1) {
        const newPosition = new Vector(this.pos.x, this.pos.y);
        return newPosition.plus(this.speed.times(time));
    }

    handleObstacle() {
        this.speed = this.speed.times(-1);
    }

    act(time = 1, plan = new Level()) {
        const newPosition = this.getNextPosition(time);
        if (plan.obstacleAt(newPosition, this.size) === undefined) {
            this.pos = newPosition;
        } else {
            this.handleObstacle();
        }
    }
}

class HorizontalFireball extends Fireball {
    constructor(pos = new Vector(), size = new Vector(1, 1), speed = new Vector(2, 0)) {
        super(pos, speed, size);
    }
}

class VerticalFireball extends Fireball {
    constructor(pos = new Vector(), size = new Vector(1, 1), speed = new Vector(0, 2)) {
        super(pos, speed, size);
    }
}

class FireRain extends Fireball {
    constructor(pos = new Vector(), size = new Vector(1, 1), speed = new Vector(0, 3)) {
        super(pos, speed, size);
        this.startPos = pos;
    }

    handleObstacle() {
        this.pos = this.startPos;
    }
}

class Coin extends Actor {
    constructor(pos = new Vector(), size = new Vector(1, 1), speed = new Vector(0, 0)) {
        super(new Vector(pos.x + 0.2, pos.y + 0.1), new Vector(0.6, 0.6));
        this.startPos = new Vector(pos.x + 0.2, pos.y + 0.1);
        this.springSpeed = 8;
        this.springDist = 0.07;
        this.spring = Math.random() * (2 * Math.PI - 0) + 0;
    }

    get type() {
        return 'coin';
    }

    updateSpring(time = 1) {
        this.spring = this.spring + this.springSpeed * time;
    }

    getSpringVector() {
        return new Vector(0, Math.sin(this.spring) * this.springDist);
    }

    getNextPosition(time = 1) {
        let newPosition = new Vector(this.startPos.x, this.startPos.y);
        this.updateSpring(time);
        return newPosition.plus(this.getSpringVector());
    }

    act(time = 1) {
        this.pos = this.getNextPosition(time);
    }
}

class Player extends Actor {
    constructor(pos = new Vector()) {
        super(new Vector(pos.x, pos.y - 0.5), new Vector(0.8, 1.5), new Vector(0, 0));
    }

    get type() {
        return 'player';
    }
}

const actorDict = {
    '@': Player,
    'o': Coin,
    '=': HorizontalFireball,
    '|': VerticalFireball,
    'v': FireRain
};

const parser = new LevelParser(actorDict);

loadLevels()
    .then(schemas => {
        return runGame(JSON.parse(schemas), parser, DOMDisplay);
    })
    .then(() => alert('Вы выиграли приз!'));
     
