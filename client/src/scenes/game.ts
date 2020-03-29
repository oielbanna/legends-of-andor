import { Farmer, Hero, HourTracker, Monster, HeroKind, Well, Tile } from '../objects';
import { game } from '../api';
import { WindowManager, CollabWindow, MerchantWindow, DeathWindow, Fight, BattleInvWindow, GameOverWindow } from "./windows";
import { RietburgCastle } from './rietburgcastle';
import BoardOverlay from './boardoverlay';

import {
  expandedWidth, expandedHeight, borderWidth,
  fullWidth, fullHeight, htX, htY, scaleFactor,
  mageTile, archerTile, warriorTile, dwarfTile,
  reducedWidth, reducedHeight,
  collabTextHeight, collabColWidth, collabRowHeight,
  wellTile1, wellTile2, wellTile3, wellTile4,
  mOffset
} from '../constants'


export default class GameScene extends Phaser.Scene {
  private heroes: Hero[];
  private hero: Hero;
  private startingHeroRank: number;
  private ownHeroType: HeroKind;

  private tiles: Tile[];
  private welltiles: Tile[];
  // Note acui: was having trouble using wells map with number typed keys, so converting to strings
  private wells: Map<string, Well>;

  private farmers: Farmer[];
  private hourTracker: HourTracker;
  private gameinstance: game;
  private monsters: Monster[];
  private monsterNameMap: Map<string, Monster>;
  private castle: RietburgCastle;

  private mockText;

  private cameraKeys;
  private cameraScrollSpeed = 15;
  private minZoom = 0.4;
  private maxZoom = 1;
  private zoomAmount = 0.01;

  private sceneplugin
  private turntext;

  constructor() {
    super({ key: 'Game' });
    this.heroes = Array<Hero>();
    this.tiles = Array<Tile>();
    this.wells = new Map();
    this.farmers = new Array<Farmer>();
    this.ownHeroType = HeroKind.Dwarf;
    this.monsters = new Array<Monster>();
    this.monsterNameMap = new Map();
    this.castle = new RietburgCastle();
  }

  public init(data) {
    this.gameinstance = data.controller;
    let type = data.heroType;
    console.log("GameScene created, client hero type: ", type);

    if (type === "dwarf") {
      this.ownHeroType = HeroKind.Dwarf
      //This will need to be moved when we implement loading and saving, but for now this is fine.
      // this.gameinstance.setMyTurn(true)
    }
    else if (type === "warrior")
      this.ownHeroType = HeroKind.Warrior
    else if (type === "mage")
      this.ownHeroType = HeroKind.Mage
    else if (type === "archer")
      this.ownHeroType = HeroKind.Archer
  }

  public preload() {
    this.load.image("gor", "../assets/gor.PNG")
    this.load.image("skral", "../assets/skral.PNG")
    this.load.image("wardrak", "../assets/wardrak.PNG")
    this.load.image("farmer", "../assets/farmer.png");
    this.load.multiatlas('tiles', './assets/tilesheet.json', 'assets')
    this.load.image("well", "../assets/well.png");

    this.load.image("WillPower2", "../assets/will2.png");
    this.load.image("WillPower3", "../assets/will3.png");
    this.load.image("Gold", "../assets/gold.png");
    this.load.image("EventCard", "../assets/event.png");
    this.load.image("Gor", "../assets/gorfog.png");
    this.load.image("Brew", "../assets/brew.png");
    this.load.image("Wineskin", "../assets/wineskin.png");
    this.load.image("Strength", "../assets/strength.png");

  }

  public create() {
    var self = this;

    this.cameraSetup();
    this.sceneplugin = this.scene
    // Centered gameboard with border
    this.add.image(fullWidth / 2, fullHeight / 2, 'gameboard')
      .setDisplaySize(expandedWidth, expandedHeight);

    this.setRegions();

    this.addMerchants();
    this.addFarmers();
    this.addMonsters();
    this.addShieldsToRietburg();

    // x and y coordinates
    this.addWell(209, 2244, wellTile1)
    this.addWell(1353, 4873, wellTile2)
    this.addWell(7073, 3333, wellTile3)
    this.addWell(5962, 770, wellTile4)

    this.addFog();

    this.gameinstance.addMonster((type, tile, id) => {
      this.addMonster(tile, type, id);
    })

    // Listen for turn to be passed to yourself
    this.gameinstance.yourTurn()

    this.gameinstance.receiveBattleInvite(function () {
      if (self.scene.isVisible('battleinv')) {
        console.log('destroying battleinv')
        WindowManager.destroy(self, 'battleinv');
      }
      console.log('creating battleinv')
      console.log('attempting to create battleinv window')
      WindowManager.create(self, 'battleinv', BattleInvWindow, { controller: self.gameinstance, hero: self.hero, gamescene: self });

    })
    this.gameinstance.receiveDeathNotice(function () {
      if (self.scene.isVisible('deathnotice')) {
        console.log('destroying deathnotice')
        WindowManager.destroy(self, 'deathnotice');
      }
      console.log('creating deathnotice')
      WindowManager.create(self, 'deathnotice', DeathWindow, { controller: self.gameinstance });

    })
    this.addGold()

    var numPlayer = 0;
    this.gameinstance.getHeros((herotypes) => {
      herotypes.forEach(type => {
        if (type === "archer") {
          self.addHero(HeroKind.Archer, archerTile, "archermale");
        } else if (type === "mage") {
          self.addHero(HeroKind.Mage, mageTile, "magemale");
        } else if (type === "warrior") {
          self.addHero(HeroKind.Warrior, warriorTile, "warriormale");
        } else if (type === "dwarf") {
          self.addHero(HeroKind.Dwarf, dwarfTile, "dwarfmale");
        }
      });

      // Need to wait for heroes to be created before creating collab decision
      self.startingCollabDecisionSetup();
      // Note that starting hero rank gets determined in collab setup
      if (self.hero.tile.id == self.startingHeroRank) {
        console.log("first turn goes to hero rank", self.startingHeroRank);
        self.gameinstance.setMyTurn(true);
      }

      this.hourTrackerSetup();

      // Add overlay to game
      const overlayData = {
        gameinstance: self.gameinstance,
        tiles: self.tiles,
        monsterMap: self.monsterNameMap,
        // gameTweens: self.tweens, not sure if this needs to be passed
        hourTracker: self.hourTracker,
        wells: self.wells,
        hk: self.ownHeroType
      };
      this.scene.add('BoardOverlay', new BoardOverlay(overlayData), true);
    })
    console.log(numPlayer);

    // Listen for end of game state
    this.gameinstance.receiveEndOfGame(function () {
      let windowData = {
        controller: self.gameinstance,
        x: reducedWidth / 2 - 200,
        y: reducedHeight / 2 - 100,
        w: 400,
        h: 200,
      }
      // Display end of game window
      WindowManager.create(self, 'gameover', GameOverWindow, windowData);
      // Freeze main game while collab window is active
      self.scene.pause();
    });

    // Listening for shields lost due to monster attack
    this.gameinstance.updateShields(function (shieldNums, add) {
      console.log("update shields", shieldNums, ", adding:", add);
      for (let shieldNum of shieldNums) {
        if (shieldNum < 0 || shieldNum > 5) continue;
        if (add) {
          self.castle.shields[shieldNum].visible = false;
        } else {
          self.castle.shields[shieldNum].visible = true;
        }
      }
    })
  }

  private cameraSetup() {
    // Set bounds of camera to the limits of the gameboard
    var camera = this.cameras.main;
    camera.setBounds(0, 0, fullWidth, fullHeight);
    // Set keys for scrolling
    // Set keys for scrolling and zooming
    this.cameraKeys = this.input.keyboard.addKeys({
      up: 'w',
      down: 's',
      left: 'a',
      right: 'd',
      zoomIn: 'q',
      zoomOut: 'e'
    });
  }


  private setRegions() {
    // Note that regions 73-79 and 83 are unused, but created anyways to preserve direct
    // indexing between regions array and region IDs
    var tilesData = require("../utils/xycoords").map;
    var treeTile = this.textures.get('tiles').getFrameNames()[12];
    for (var element in tilesData) {
      var tile = new Tile(element, this, tilesData[element].xcoord * scaleFactor + borderWidth, tilesData[element].ycoord * scaleFactor + borderWidth, treeTile);
      this.tiles[element] = tile;
      tile.setInteractive();
      this.add.existing(tile);
    }

    /// for movement callback, ties pointerdown to move request
    var self = this
    this.tiles.map(function (tile) {
      tile.on('pointerdown', function () {
        console.log("It is my turn: ", self.gameinstance.myTurn)
        self.gameinstance.moveRequest(tile.id, updateMoveRequest)
      })
    })

    this.gameinstance.updateMoveRequest(updateMoveRequest)

    function updateMoveRequest(heroKind, tileID) {
      self.heroes.forEach((hero: Hero) => {
        if (hero.getKind().toString() === heroKind) {
          hero.moveTo(self.tiles[tileID])
        }
      })
    }

  }

  private addShieldsToRietburg() {
    let s1 = this.add.sprite(85, 190, 'weed').setDisplaySize(40, 40)
    let s2 = this.add.sprite(155, 190, 'weed').setDisplaySize(40, 40)
    let s3 = this.add.sprite(225, 190, 'weed').setDisplaySize(40, 40)
    let s4 = this.add.sprite(85, 310, 'weed').setDisplaySize(40, 40)
    let s5 = this.add.sprite(155, 310, 'weed').setDisplaySize(40, 40)
    let s6 = this.add.sprite(85, 430, 'weed').setDisplaySize(40, 40)

    this.castle.shields.push(s1)
    this.castle.shields.push(s2)
    this.castle.shields.push(s3)
    this.castle.shields.push(s4)
    this.castle.shields.push(s5)
    this.castle.shields.push(s6)

    var self = this;

    this.gameinstance.getNumShields(function (numShields) {
      for (var i = 0; i < numShields; i++) {
        self.castle.shields[i].visible = false;
      }
    })
  }

  private addMerchants() {
    const merchtile_18: Tile = this.tiles[18];
    const merchtile_57: Tile = this.tiles[57];
    const merchtile_71: Tile = this.tiles[71];

    var self = this;

    merchtile_18.on('pointerdown', function (pointer) {
      if (self.hero.tile.id == merchtile_18.id) {

        if (this.scene.isVisible('merchant1')) {
          WindowManager.destroy(self, 'merchant1');
        } else {
          WindowManager.create(self, 'merchant1', MerchantWindow, { controller: self.gameinstance });
          let window = WindowManager.get(self, 'merchant1')

        }

      }

    }, this);

    merchtile_57.on('pointerdown', function (pointer) {
      if (self.hero.tile.id == merchtile_18.id) {

        if (this.scene.isVisible('merchant2')) {
          WindowManager.destroy(self, 'merchant2');
        } else {
          WindowManager.create(self, 'merchant2', MerchantWindow, { controller: self.gameinstance });
          let window = WindowManager.get(self, 'merchant2')
        }

      }

    }, this);

    merchtile_71.on('pointerdown', function (pointer) {
      if (self.hero.tile.id == merchtile_18.id) {

        if (this.scene.isVisible('merchant3')) {
          WindowManager.destroy(self, 'merchant3');
        } else {
          WindowManager.create(self, 'merchant3', MerchantWindow, { controller: self.gameinstance });
          let window = WindowManager.get(self, 'merchant3')
        }

      }

    }, this);

  }

  private addMonsters() {
    this.addMonster(8, 'gor', 'gor1');
    this.addMonster(20, 'gor', 'gor2');
    this.addMonster(21, 'gor', 'gor3');
    this.addMonster(26, 'gor', 'gor4');
    this.addMonster(48, 'gor', 'gor5');
    this.addMonster(19, 'skral', 'skral1');
  }

  private addMonster(monsterTile: number, type: string, id: string) {
    const tile: Tile = this.tiles[monsterTile];
    let monster: Monster = new Monster(this, tile, type, id).setInteractive().setScale(.5);
    this.monsters.push(monster);
    this.monsterNameMap[monster.name] = monster;
    tile.setMonster(monster);
    this.add.existing(monster);
    monster.on('pointerdown', function (pointer) {
      if (this.scene.isVisible(monster.name)) {
        WindowManager.destroy(this, monster.name);
      }
      else {
        WindowManager.create(this, monster.name, Fight, {
          controller: this.gameinstance,
          hero: this.hero, monster: monster, heroes: this.heroes
        });
        this.scene.pause()
      }
    }, this)

  }

  private addFarmers() {

    const farmertile_0: Tile = this.tiles[24];
    const farmertile_1: Tile = this.tiles[36];

    let farmer_0: Farmer = new Farmer(0, this, farmertile_0, 'farmer').setDisplaySize(40, 40);
    let farmer_1: Farmer = new Farmer(1, this, farmertile_1, 'farmer').setDisplaySize(40, 40);

    // var gridX1 = farmertile_0.farmerCoords[0][0];
    // var gridY1 = farmertile_0.farmerCoords[0][1];

    // var gridX2 = farmertile_1.farmerCoords[1][0];
    // var gridY2 = farmertile_1.farmerCoords[1][1];

    // var farmerIcon1 = this.add.sprite(gridX1, gridY1, 'farmer').setDisplaySize(40, 40);
    // var farmerIcon2 = this.add.sprite(gridX2, gridY2, 'farmer').setDisplaySize(40, 40);

    // let farmer_0: Farmer = new Farmer(this, farmertile_0, farmerIcon1).setDisplaySize(40, 40);
    // let farmer_1: Farmer = new Farmer(this, farmertile_1, farmerIcon2).setDisplaySize(40, 40);

    farmer_0.setInteractive();
    farmer_1.setInteractive();

    this.farmers.push(farmer_0);
    this.farmers.push(farmer_1);

    farmertile_0.farmer.push(farmer_0);
    farmertile_0.farmerexist = true;
    farmertile_1.farmer.push(farmer_1);
    farmertile_1.farmerexist = true;

    this.add.existing(farmer_0);
    this.add.existing(farmer_1);

    var self = this;

    farmer_0.on('pointerdown', function (pointer) {
      //if (self.hero.tile.id == self.farmers[0].tile.id) {
      self.gameinstance.pickupFarmer(function (tileid) {
        let pickedFarmer: Farmer = self.tiles[tileid].farmer.pop();
        for (var i = 0; i < 2; i++) {
          if (self.farmers[i].id === pickedFarmer.id) {
            self.farmers[i].tile = undefined;
            self.hero.farmers.push(pickedFarmer)
            break;
          }
        }
        pickedFarmer.destroy()
        console.log(self.hero.farmers)
      });
    }, this);

    farmer_1.on('pointerdown', function (pointer) {
      if (self.hero.tile.id == self.farmers[1].tile.id) {
        self.gameinstance.pickupFarmer(function (tileid) {
          let pickedFarmer: Farmer = self.tiles[tileid].farmer.pop();
          for (var i = 0; i < 2; i++) {
            if (self.farmers[i].id === pickedFarmer.id) {
              self.farmers[i].tile = undefined;
              self.hero.farmers.push(pickedFarmer)
              break;
            }
          }
          pickedFarmer.destroy()
          console.log(self.hero.farmers)
        });
      }
    }, this);

    this.gameinstance.destroyFarmer(function (tileid) {
      let pickedFarmer: Farmer = self.tiles[tileid].farmer.pop();
      for (var i = 0; i < 2; i++) {
        if (self.farmers[i] === pickedFarmer) {
          self.farmers[i].tile = undefined;
          console.log(self.farmers[i].tile)
          break;
        }
      }
      pickedFarmer.destroy()

    });

    this.gameinstance.addFarmer(function (tileid, farmerid) {
      if (tileid === 0) {
        let newFarmer = self.hero.farmers.pop()
        for (var i = 0; i < 6; i++) {
          if (self.castle.shields[i].visible == true) {
            self.castle.shields[i].visible = false;
            break;
          }
        }
      } else {
        let newFarmer = self.hero.farmers.pop()

        if (farmerid === 0) {
          newFarmer = new Farmer(0, self, self.tiles[tileid], 'farmer').setDisplaySize(40, 40)
        } else if (farmerid === 1) {
          newFarmer = new Farmer(1, self, self.tiles[tileid], 'farmer').setDisplaySize(40, 40)
        }

        self.tiles[tileid].farmer.push(newFarmer)

        newFarmer.setInteractive()

        newFarmer.on('pointerdown', function (pointer) {
          //if (self.hero.tile.id == self.farmers[0].tile.id) {
          self.gameinstance.pickupFarmer(function (tileid) {
            let pickedFarmer: Farmer = self.tiles[tileid].farmer.pop();
            for (var i = 0; i < 2; i++) {
              if (self.farmers[i].id === pickedFarmer.id) {
                self.farmers[i].tile = undefined;
                self.hero.farmers.push(pickedFarmer)
                break;
              }
            }
            pickedFarmer.destroy()
            console.log(self.hero.farmers)
          });
        }, this);
        self.add.existing(newFarmer)
      }
    });

  }

  private addHero(type: HeroKind, tileNumber: number, texture: string) {
    const tile: Tile = this.tiles[tileNumber]
    let hero: Hero = new Hero(this, tile, texture, type).setDisplaySize(40, 40);
    this.heroes.push(hero);
    tile.hero = hero;
    this.add.existing(hero);
    if (this.ownHeroType === type) {
      this.hero = hero;
    }
  }

  private addWell(x, y, tileNumber: number) {
    const tile: Tile = this.tiles[tileNumber];
    const newWell = new Well(this, x * scaleFactor + borderWidth,
      y * scaleFactor + borderWidth, "well", tile, this.gameinstance).setDisplaySize(40, 45);
    this.add.existing(newWell);
    this.wells.set("" + newWell.getTileID(), newWell);
  }

  private addFog() {
    this.gameinstance.getFog((fogs) => {
      console.log(fogs)
      fogs.forEach((fog) => {
        const tile: Tile = this.tiles[fog[0]];
        const f = this.add.sprite(tile.x + 50, tile.y - 5, fog[1]).setDisplaySize(60, 60);
        f.name = fog[1];
        f.setTint(0x101010); // darken
        tile.setFog(f) // add to tile
        f.setInteractive()
        this.add.existing(f);
        f.on("pointerdown", (pointer) => {
          this.gameinstance.useFog(f.name, tile.id, (tile) => {
            console.log(tile, typeof tile)
            let f = this.tiles[+tile].getFog();
            f.clearTint();
            setTimeout(() => {
              f.destroy()
            }, 800);
          })
        }, this)
      })
    });


    this.gameinstance.destroyFog((tile) => {
      let f = this.tiles[+tile].getFog();
      f.clearTint();
      setTimeout(() => {
        f.destroy()
      }, 800);
    });
  }

  private addGold() {
    var self = this
    for (let id in self.tiles) { // of dattara tile object ga iterate sareru
      //create a text Sprite indicating the number of gold. 
      var goldText = self.add.text(50, 50, "G", { color: "#fff52e" }).setX(self.tiles[id].x - 30).setY(self.tiles[id].y - 30)
      //set to interactive
      goldText.setInteractive()
      self.add.existing(goldText);
      goldText.on("pointerdown", function (pointer) {
        self.gameinstance.pickupGold(id, function () {
          if (self.tiles[id].getGold() > 0) {
            console.log("amount on client-tile: ", self.tiles[id].getGold())
            self.tiles[id].setGold(self.tiles[id].getGold() - 1)
            console.log("amount on client-tile: ", self.tiles[id].getGold())   //amount of gold on tile is updated
          }
        })
      }, this)

      self.gameinstance.updatePickupGold(function (pointer) {
        if (self.tiles[id].getGold() > 0) {
          console.log(self.tiles[id].getGold())
          self.tiles[id].setGold(self.tiles[id].getGold() - 1)
          console.log(self.tiles[id].getGold())
        }
      }, this)
    }
  }

  private startingCollabDecisionSetup() {
    var self = this;

    var style2 = {
      fontFamily: '"Roboto Condensed"',
      fontSize: "20px",
      backgroundColor: '#f00'
    }

    var res = new Map([
      ["gold", 5],
      ["wineskin", 2]
    ])
    // Determine width of the window based on how many resources are being distributed
    var width = (res.size + 1) * collabColWidth; // Not sure if there's a better way of getting size of ts obj
    // Determine height of the window based on number of players involved
    var height = (self.heroes.length + 2) * collabRowHeight;
    // Set data depending on whether the client is the owner of the decision
    // Get hero of lowest rank, based on their starting tile
    var heroRanks = [];
    for (let hero of self.heroes) { heroRanks.push(hero.tile.id); }
    self.startingHeroRank = Math.min(...heroRanks);
    var collabWindowData = (self.hero.tile.id == self.startingHeroRank) ?
      {
        controller: self.gameinstance,
        isOwner: true,
        heroes: self.heroes,
        resources: res,
        textOptions: null,
        x: reducedWidth / 2 - width / 2,
        y: reducedHeight / 2 - height / 2,
        w: width,
        h: height,
        infight: false
      } :
      {
        controller: self.gameinstance,
        isOwner: false,
        x: reducedWidth / 2 - width / 2,
        y: reducedHeight / 2 - height / 2,
        w: 200,
        h: 100,
        infight: false
      }
    WindowManager.create(this, 'collab', CollabWindow, collabWindowData);
    // Freeze main game while collab window is active
    this.scene.pause();
  }

  // Creating the hour tracker
  private hourTrackerSetup() {
    //x, y coordinates
    var htx = htX;
    var hty = htY;
    var self = this
    var heroSprites = new Map();
    for (var h of this.heroes) {
      var sprite = self.add.sprite(htx, hty, h.texture.key).setDisplaySize(40, 40)
      heroSprites.set(h.getKind(), sprite);
      switch (h.getKind()) {
        case HeroKind.Archer:
          sprite.x = htx - 20
          sprite.y = hty - 20
          break
        case HeroKind.Dwarf:
          sprite.x = htx + 20
          sprite.y = hty - 20
          break
        case HeroKind.Mage:
          sprite.x = htx - 20
          sprite.y = hty + 20
          break
        case HeroKind.Warrior:
          sprite.x = htx + 20
          sprite.y = hty + 20
          break
      }
    }
    this.hourTracker = new HourTracker(this, htx, hty, heroSprites);

    // we're not actually adding the hourTracker, we're adding it's internal sprite
    this.hourTracker.depth = 5;
    this.hourTracker.depth = 0;
    for (var h of this.heroes) {
      h.hourTracker = this.hourTracker;
    }
  }

  public update() {
    var camera = this.cameras.main;

    // Scroll updates
    if (this.cameraKeys["up"].isDown) {
      camera.scrollY -= this.cameraScrollSpeed;
    } else if (this.cameraKeys["down"].isDown) {
      camera.scrollY += this.cameraScrollSpeed;
    }

    if (this.cameraKeys["left"].isDown) {
      camera.scrollX -= this.cameraScrollSpeed;
    } else if (this.cameraKeys["right"].isDown) {
      camera.scrollX += this.cameraScrollSpeed;
    }

    // Zoom updates
    if (this.cameraKeys["zoomIn"].isDown && camera.zoom < this.maxZoom) {
      camera.zoom += this.zoomAmount;
    } else if (this.cameraKeys["zoomOut"].isDown && camera.zoom > this.minZoom) {
      camera.zoom -= this.zoomAmount;
    }
  }

}