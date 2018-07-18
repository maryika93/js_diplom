'use strict';

class Vector {
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
        const x = this.x * number;
        const y = this.y * number;
        return new Vector(x, y);
    }
}

class Actor {
    constructor(pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
        if (!(pos instanceof Vector) || !(size instanceof Vector) || !(speed instanceof Vector)) {
            throw new Error("Можно передавать только вектор типа Vector");
        }
        this.pos = pos;
        this.size = size;
        this.speed = speed;
    }

    act() {
    }

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
        if (!(item instanceof Actor)) {
            throw new Error("Можно передавать только объект типа Actor");
        }
        if (item === this) {
            return false;
        }
        return this.top < item.bottom && this.bottom > item.top && this.left < item.right && this.right > item.left;
    }
}

class Level {
    constructor(grid = [], actors = []) {
        this.grid = grid.slice();
        this.actors = actors.slice();
        this.player = this.actors.find(el => el.type === 'player');
        this.height = this.grid.length;
        const len = this.grid.map(item => item.length);
        this.width = Math.max(0, ...len);
        this.status = null;
        this.finishDelay = 1;
    }

    isFinished() {
        return this.status !== null && this.finishDelay < 0;
    }

    actorAt(item) {
        if (!(item instanceof Actor)) {
            throw new Error("Можно передавать только объект типа Actor");
        }
        return this.actors.find(el => el.isIntersect(item));
    }

    obstacleAt(pos, size) {
        if (!(pos instanceof Vector) || !(size instanceof Vector)) {
            throw new Error("Можно передавать только вектор типа Vector");
        }
        if (pos.y < 0 || pos.x < 0 || (pos.x + size.x) > this.width) {
            return 'wall';
        }
        if ((pos.y + size.y) > this.height) {
            return 'lava';
        }
        const top = Math.floor(pos.y);
        const bottom = Math.ceil(pos.y + size.y);
        const left = Math.floor(pos.x);
        const right = Math.ceil(pos.x + size.x);
        for (let i = top; i < bottom; i++) {
            for (let j = left; j < right; j++) {
                const cell = this.grid[i][j];
                if (cell) {
                    return cell;
                }
            }
        }
    }

    removeActor(item) {
        const index = this.actors.indexOf(item);
        if (index !== -1) {
            this.actors.splice(index, 1);
        }
    }

    noMoreActors(item) {
        return !this.actors.some(actor => actor.type === item);
    }

    playerTouched(objType, obj = {}) {
        if (objType === 'lava' || objType === 'fireball') {
            this.status = 'lost';
        }
        if (objType === 'coin' && obj.type === 'coin') {
            this.removeActor(obj);
            if (this.noMoreActors('coin')) {
                this.status = 'won';
            }
        }
    }
}

class LevelParser {
    constructor(dictionary = {}) {
        this.dictionary = Object.assign({}, dictionary);
    }

    actorFromSymbol(sym) {
        return this.dictionary[sym];
    }

    obstacleFromSymbol(sym) {
        if (sym === 'x') {
            return 'wall';
        }
        if (sym === '!') {
            return 'lava';
        }
    }

    createGrid(arrayStr = []) {
        return arrayStr.map(item => item.split('').map(el => this.obstacleFromSymbol(el)));
    }

    createActors(arrayStr) {
        return arrayStr.reduce((result, line, i) => {
            line.split('').forEach((cell, j) => {
                const item = this.actorFromSymbol(cell);
                if (typeof item === 'function') {
                    const newObj = new item(new Vector(j, i));
                    if (newObj instanceof Actor) {
                        result.push(newObj);
                    }
                }
            })
            return result;
        }, []);
    }

    parse(arrayStr = []) {
        const grid = this.createGrid(arrayStr);
        const obj = this.createActors(arrayStr);
        return (new Level(grid, obj));
    }
}

class Fireball extends Actor {
    constructor(pos = new Vector(0, 0), speed = new Vector(0, 0)) {
        super(pos, new Vector(1, 1), speed);
    }

    get type() {
        return 'fireball';
    }

    getNextPosition(time = 1) {
        return this.pos.plus(this.speed.times(time));
    }

    handleObstacle() {
        this.speed = this.speed.times(-1);
    }

    act(time = 1, plan = new Level()) {
        const newPosition = this.getNextPosition(time);
        if (plan.obstacleAt(newPosition, this.size)) {
            this.handleObstacle();
        } else {
            this.pos = newPosition;
        }
    }
}

class HorizontalFireball extends Fireball {
    constructor(pos = new Vector(0, 0)) {
        super(pos, new Vector(2, 0));
    }
}

class VerticalFireball extends Fireball {
    constructor(pos = new Vector(0, 0)) {
        super(pos, new Vector(0, 2));
    }
}

class FireRain extends Fireball {
    constructor(pos = new Vector()) {
        super(pos, new Vector(0, 3), new Vector(1, 1));
        this.startPos = pos;
    }

    handleObstacle() {
        this.pos = this.startPos;
    }
}

class Coin extends Actor {
    constructor(pos = new Vector(0, 0)) {
        super(pos.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6), new Vector(0, 0));
        this.startPos = new Vector(pos.x + 0.2, pos.y + 0.1);
        this.springSpeed = 8;
        this.springDist = 0.07;
        this.spring = Math.random() * (2 * Math.PI);
    }

    get type() {
        return 'coin';
    }

    updateSpring(time = 1) {
        this.spring += this.springSpeed * time;
    }

    getSpringVector() {
        return new Vector(0, Math.sin(this.spring) * this.springDist);
    }

    getNextPosition(time = 1) {
        this.updateSpring(time);
        return this.startPos.plus(this.getSpringVector());
    }

    act(time = 1) {
        this.pos = this.getNextPosition(time);
    }
}

class Player extends Actor {
    constructor(pos = new Vector(0, 0)) {
        super(pos.plus(new Vector(0, -0.5)), new Vector(0.8, 1.5), new Vector(0, 0));
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