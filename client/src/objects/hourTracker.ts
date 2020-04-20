import * as Phaser from 'phaser';
import { Hero } from './hero';
import {htX, htShift} from '../constants'
import {HeroKind} from './HeroKind'

export class HourTracker extends Phaser.GameObjects.Sprite {
    private heroSprites: Map<HeroKind,Phaser.GameObjects.Sprite>;

    constructor(scene, x, y, heroSprites) {
        // Note that the texture for hourTracker is not actually used
        // Instead we pass up to 4 sprites to use internally, 1 for each hero
        super(scene, x, y, heroSprites[0]);
        this.heroSprites = heroSprites
    }
    
    public reset(hk: HeroKind, firstEndDay: boolean) {
        // Place sprite on the rooster
        console.log("ht resetting for", hk, firstEndDay)
        var extraShift = firstEndDay ? 0 : htShift;
        if (hk == HeroKind.Archer || hk == HeroKind.Mage) {
            this.heroSprites.get(hk).x = htX-20-extraShift;
        } else {
            this.heroSprites.get(hk).x = htX+20-extraShift;
        }
    }

    public resetAll() {
        console.log(this.heroSprites);
        this.heroSprites.forEach((sprite, heroKind) => {
            if (heroKind == HeroKind.Archer || heroKind == HeroKind.Mage) {
                sprite.x = htX-20;
            } else {
                sprite.x = htX+20;
            }
        })
    }

    public incHour(hk: HeroKind) {
        console.log(hk, "ht inc");
        var shift = this.heroSprites.get(hk).x < htX-20 ? htShift*2 : htShift;
        this.heroSprites.get(hk).x += shift;
    }

    // public getCount(hk: HeroKind) {
    //     return this.heroSprites[hk];
    // }
}