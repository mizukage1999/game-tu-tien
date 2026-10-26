import Phaser from 'phaser';
import type { WorldScene } from '../scenes/WorldScene';
import { AnimationController } from '../anim/AnimationController';
import { iso } from '../art/iso';
import { playerArt } from '../systems/character';
import { stepToward, type RemotePlayerState } from '../../net/presence';
import { socialStore } from '../../store/socialStore';
import type { Vec2 } from '../types';
import { settingsStore } from '../../store/settingsStore';
import { rosterArt } from '../art/heroRoster';
import { directionalArt } from '../art/directionalHeroes';
import { heroFor } from '../../data/heroes';
import { heroDirection, type HeroDirection } from '../art/heroDirections';
import { isoVector } from '../art/iso';
import { flightRotation } from '../systems/flightVisual';
import type { SkillId } from '../../data';

const PARTY_COLOR = '#7dffa8';
const STRANGER_COLOR = '#cfe9ff';

/**
 * Draws another human from shared combat and movement snapshots. The map's
 * authority resolves hits; this renderer interpolates position without a local
 * physics body or independent combat simulation.
 */
export class RemotePlayer {
  private sprite: Phaser.GameObjects.Sprite;
  private ctrl: AnimationController;
  private shadow: Phaser.GameObjects.Image;
  private label: Phaser.GameObjects.Text;
  private state: RemotePlayerState;
  private target: Vec2;
  private map: Vec2;
  private tintTween?: Phaser.Tweens.Tween;
  private mountArt:Phaser.GameObjects.Image;
  private bubble?:Phaser.GameObjects.Text;
  private stopParty:()=>void;
  get userId(){return this.state.userId;}

  constructor(
    world: WorldScene,
    state: RemotePlayerState,
  ) {
    this.state = state;
    this.target = { x: state.x, y: state.y };
    this.map = { x: state.x, y: state.y };
    const authored = world.textures.exists(directionalArt(heroFor(state).id,!!state.child))?directionalArt(heroFor(state).id,!!state.child):state.heroId ? rosterArt(state.heroId) : state.sex === 'male' ? 'hero-wang-v5' : 'hero-li-v5';
    const art = world.textures.exists(authored) ? authored : playerArt(state.sex);
    const spot = iso(state.x, state.y);
    this.sprite = world.add.sprite(spot.x, spot.y, art).setOrigin(0.5, 1);
    this.ctrl = new AnimationController(this.sprite, art);
    this.shadow = world.add.image(spot.x, spot.y - 2, 'shadow').setDepth(-100);
    this.mountArt=world.add.image(spot.x,spot.y,'immortal-sword').setVisible(false);
    this.label = world.add
      .text(spot.x, spot.y - 108, `${state.realm}\n${state.name}`, {
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: STRANGER_COLOR,
        stroke: '#1a2240',
        strokeThickness: 3,
        align:'center',resolution:2,
      })
      .setOrigin(0.5, 1)
      .setDepth(90000);
    this.label.setVisible(settingsStore.getState().preferences.showNames);
    this.ctrl.play('idle', state.visualDir??state.dir);
    // Clicking a body opens their card. The label is also clickable so a
    // crowded spawn still lets you pick someone.
    this.sprite.setInteractive({ useHandCursor: true });
    this.label.setInteractive({ useHandCursor: true });
    const open = () => socialStore.getState().openCard(state.userId);
    this.sprite.on('pointerdown', open);
    this.label.on('pointerdown', open);
    this.applyPartyStyle();
    // Party membership changes without a new presence entry, so re-check often.
    this.stopParty=socialStore.subscribe(() => this.applyPartyStyle());
  }

  apply(next: RemotePlayerState) {
    const art=directionalArt(heroFor(next).id,!!next.child);
    if(this.sprite.texture.key!==art&&this.sprite.scene.textures.exists(art)){this.ctrl.destroy();this.sprite.setTexture(art);this.ctrl=new AnimationController(this.sprite,art);}
    this.state = next;
    this.target.x = next.x;
    this.target.y = next.y;
    this.label.setText(`${next.realm}\n${next.name}`);
    this.applyPartyStyle();
  }

  update(dt: number) {
    // Interpolation stays in map space; only the drawn position is projected.
    this.map = stepToward(this.map, this.target, dt);
    const spot = iso(this.map.x, this.map.y);
    const lift=this.state.mount?44+Math.sin(this.sprite.scene.time.now/500)*2:0;
    this.sprite.setPosition(spot.x, spot.y-lift).setDepth(spot.y).setAlpha(this.state.combat?.hp === 0 ? .45 : 1);
    const face={x:this.state.dx??0,y:this.state.dy??1};
    this.mountArt.setVisible(!!this.state.mount&&!!this.state.showMount);
    if(this.state.mount)this.mountArt.setTexture(`immortal-${this.state.mount}`).setDisplaySize(160,100).setRotation(this.state.mount==='sword'?flightRotation(face):0).setFlipX(this.state.mount==='crane'&&isoVector(face.x,face.y).x<0).setPosition(spot.x,spot.y-lift+(this.state.mount==='sword'?-1:20)).setDepth(spot.y-.1);
    this.shadow.setPosition(spot.x, spot.y - 2);
    this.label.setPosition(spot.x, spot.y - (this.state.child?92:119)-lift);
    this.bubble?.setPosition(spot.x,spot.y-(this.state.child?128:155)-lift);
    this.label.setVisible(settingsStore.getState().preferences.showNames);
    const vector=isoVector(face.x,face.y),dir=this.state.visualDir??heroDirection(vector.x,vector.y);
    this.ctrl.play(this.state.combat?.hp===0?'downed':this.state.moving ? 'run' : 'idle', dir);
  }

  /** Party members get a green name and a soft glow so you can spot them in a crowd. */
  private applyPartyStyle() {
    const { partyId } = socialStore.getState();
    const mine = !!partyId && this.state.party === partyId;
    const color = mine ? PARTY_COLOR : STRANGER_COLOR;
    if (this.label.style.color !== color) this.label.setColor(color);
    if (mine && !this.tintTween) {
      this.tintTween = this.sprite.scene.tweens.add({
        targets: this.sprite,
        alpha: { from: 0.92, to: 1 },
        duration: 700,
        yoyo: true,
        repeat: -1,
      });
    } else if (!mine && this.tintTween) {
      this.tintTween.stop();
      this.tintTween = undefined;
      this.sprite.setAlpha(1);
    }
  }

  destroy() {
    this.stopParty?.();this.ctrl.destroy();this.mountArt.destroy();this.bubble?.destroy();
    this.tintTween?.stop();
    this.label.destroy();
    this.shadow.destroy();
    this.sprite.destroy();
  }
  cast(skill:SkillId,dir:HeroDirection){this.ctrl.play(skill==='basic'?'attack':skill==='than_phap'?'run':'cast',dir,{lock:skill!=='than_phap',force:true});}
  speech(text:string,privateChat=false){
    this.bubble?.destroy();this.bubble=this.sprite.scene.add.text(this.sprite.x,this.sprite.y-155,text.slice(0,100),{fontSize:'12px',fontFamily:'Arial',color:'#16293c',backgroundColor:privateChat?'#f2b9d9':'#f4ebda',padding:{x:8,y:5},wordWrap:{width:180},resolution:2}).setOrigin(.5,1).setDepth(95000);
    const bubble=this.bubble;this.sprite.scene.time.delayedCall(4500,()=>{bubble.destroy();if(this.bubble===bubble)this.bubble=undefined;});
  }
}
