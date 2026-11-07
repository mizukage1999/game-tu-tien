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
import { directionalArt, ensureDirectionalHero } from '../art/directionalHeroes';
import { heroFor } from '../../data/heroes';
import { heroDirection, type HeroDirection } from '../art/heroDirections';
import { isoVector } from '../art/iso';
import type { SkillId } from '../../data';
import { RealmNameplate } from './RealmNameplate';
import { worldInputBlocked } from '../systems/inputFocus';
import { HERO_WORLD_SCALE } from '../art/heroVisual';
import { placeActor } from '../art/actorDepth';
import { acquireAppearance, type AppearanceLease } from '../art/cosmeticTextures';
import { cosmeticsForHero } from '../../data/cosmetics';
import { CosmeticWeapon } from '../art/CosmeticWeapon';

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
  private nameplate: RealmNameplate;
  private state: RemotePlayerState;
  private target: Vec2;
  private map: Vec2;
  private tintTween?: Phaser.Tweens.Tween;
  private mountArt:Phaser.GameObjects.Image;
  private bubble?:Phaser.GameObjects.Text;
  private stopParty:()=>void;
  private appearanceLease?: AppearanceLease;
  private appearanceRequest=0;
  private lookIdentity='';
  private lookRetryAt=0;
  private weaponLook: CosmeticWeapon;
  get userId(){return this.state.userId;}

  constructor(
    world: WorldScene,
    state: RemotePlayerState,
  ) {
    this.state = state;
    this.target = { x: state.x, y: state.y };
    this.map = { x: state.x, y: state.y };
    ensureDirectionalHero(world, heroFor(state).id, !!state.child);
    const authored = world.textures.exists(directionalArt(heroFor(state).id,!!state.child))?directionalArt(heroFor(state).id,!!state.child):state.heroId ? rosterArt(state.heroId) : state.sex === 'male' ? 'hero-wang-v5' : 'hero-li-v5';
    const art = world.textures.exists(authored) ? authored : playerArt(state.sex);
    const spot = iso(state.x, state.y);
    this.sprite = world.add.sprite(spot.x, spot.y, art).setOrigin(0.5, 1).setScale(HERO_WORLD_SCALE);
    this.ctrl = new AnimationController(this.sprite, art);
    this.shadow = world.add.image(spot.x, spot.y - 2, 'shadow').setDepth(-100);
    this.mountArt=world.add.image(spot.x,spot.y,'immortal-sword').setVisible(false);
    this.weaponLook=new CosmeticWeapon(world);
    this.nameplate = new RealmNameplate(world,{level:state.combat?.level,realm:state.realm,child:state.child},state.name,STRANGER_COLOR);
    this.nameplate.setVisible(settingsStore.getState().preferences.showNames);
    this.ctrl.play('idle', state.visualDir??state.dir);
    // Clicking a body opens their card. The label is also clickable so a
    // crowded spawn still lets you pick someone.
    this.sprite.setInteractive({ useHandCursor: true });
    const open = () => { if (!worldInputBlocked()) socialStore.getState().openCard(state.userId); };
    this.sprite.on('pointerdown', open);
    this.nameplate.clickable(open);
    this.applyPartyStyle();
    // Party membership changes without a new presence entry, so re-check often.
    this.stopParty=socialStore.subscribe(() => this.applyPartyStyle());
    this.refreshLook();
  }

  apply(next: RemotePlayerState) {
    this.state = next;
    this.refreshLook();
    this.target.x = next.x;
    this.target.y = next.y;
    this.nameplate.sync({level:next.combat?.level,realm:next.realm,child:next.child},next.name);
    this.applyPartyStyle();
  }

  update(dt: number) {
    this.refreshLook();
    // Interpolation stays in map space; only the drawn position is projected.
    this.map = stepToward(this.map, this.target, dt);
    const spot = iso(this.map.x, this.map.y);
    const lift=this.state.mount?44+Math.sin(this.sprite.scene.time.now/500)*2:0;
    placeActor(this.sprite,spot.x,spot.y-lift,spot.y).setAlpha(this.state.combat?.hp === 0 ? .45 : 1);
    const face={x:this.state.dx??0,y:this.state.dy??1};
    const vector=isoVector(face.x,face.y),dir=this.state.visualDir??heroDirection(vector.x,vector.y),look=cosmeticsForHero(heroFor(this.state).id,this.state.cosmetics);
    this.weaponLook.sync(look.weapon,{x:spot.x,y:spot.y-lift},dir,!!this.state.mount||!!this.state.child||this.state.combat?.hp===0,this.sprite.frame.cutY>=480,this.sprite.texture.key,this.sprite.frame.cutY);
    this.mountArt.setVisible(!!this.state.mount&&!!this.state.showMount);
    if(this.state.mount)this.weaponLook.placeMount(this.mountArt,this.state.mount,face,spot,lift);
    this.shadow.setPosition(spot.x, spot.y - 2);
    this.nameplate.place(spot.x, spot.y - (this.state.child?92:119)*HERO_WORLD_SCALE-lift,settingsStore.getState().preferences.showNames);
    this.bubble?.setPosition(spot.x,spot.y-(this.state.child?146:218)*HERO_WORLD_SCALE-lift);
    this.ctrl.play(this.state.combat?.hp===0?'downed':this.state.moving ? 'run' : 'idle', dir);
  }

  private refreshLook() {
    const id=heroFor(this.state).id,child=!!this.state.child,look=cosmeticsForHero(id,this.state.cosmetics),signature=`${id}:${child}:${look.outfit}:${!!look.weapon}`;
    if(signature===this.lookIdentity||performance.now()<this.lookRetryAt)return;
    this.lookIdentity=signature;const request=++this.appearanceRequest,scene=this.sprite.scene;
    void acquireAppearance(scene,id,child,look.outfit,!!look.weapon).then(async lease=>{
      if(!lease){if(request===this.appearanceRequest){this.lookIdentity='';this.lookRetryAt=performance.now()+10000;}return;}
      while(this.ctrl.locked&&this.sprite.active&&request===this.appearanceRequest)await new Promise(resolve=>setTimeout(resolve,30));
      if(!this.sprite.active||request!==this.appearanceRequest){lease.release();return;}
      if(this.sprite.texture.key===lease.key){lease.release();return;}
      this.ctrl.destroy();this.sprite.anims.stop();this.sprite.setTexture(lease.key);this.ctrl=new AnimationController(this.sprite,lease.key);
      this.appearanceLease?.release();this.appearanceLease=lease;
    });
  }

  /** Party members get a green name and a soft glow so you can spot them in a crowd. */
  private applyPartyStyle() {
    const { partyId } = socialStore.getState();
    const mine = !!partyId && this.state.party === partyId;
    const color = mine ? PARTY_COLOR : STRANGER_COLOR;
    this.nameplate.setNameColor(color);
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
    this.appearanceRequest++;this.appearanceLease?.release();this.weaponLook.destroy();
    this.stopParty?.();this.ctrl.destroy();this.mountArt.destroy();this.bubble?.destroy();
    this.tintTween?.stop();
    this.nameplate.destroy();
    this.shadow.destroy();
    this.sprite.destroy();
  }
  cast(skill:SkillId,dir:HeroDirection){this.ctrl.play(skill==='basic'?'attack':skill==='than_phap'?'run':'cast',dir,{lock:skill!=='than_phap',force:true});}
  speech(text:string,privateChat=false){
    this.bubble?.destroy();this.bubble=this.sprite.scene.add.text(this.sprite.x,this.sprite.y-155,text.slice(0,100),{fontSize:'12px',fontFamily:'Arial',color:'#16293c',backgroundColor:privateChat?'#f2b9d9':'#f4ebda',padding:{x:8,y:5},wordWrap:{width:180},resolution:2}).setOrigin(.5,1).setDepth(95000);
    const bubble=this.bubble;this.sprite.scene.time.delayedCall(4500,()=>{bubble.destroy();if(this.bubble===bubble)this.bubble=undefined;});
  }
}
