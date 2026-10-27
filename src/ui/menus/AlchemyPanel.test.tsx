// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { AlchemyPanel } from './AlchemyPanel';
import { gameStore, newPlayer } from '../../store/gameStore';
import { EventBus } from '../../game/EventBus';
vi.mock('../../game/art/icons', () => ({ itemIconUrl: () => '/item.png' }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
it('uses actual recipes, batch costs, inventory and gathering destinations through the new alchemy UI', () => {
  const previous = gameStore.getState(),
    host = document.createElement('div'),
    root = createRoot(host);
  gameStore.setState({
    player: { ...newPlayer(), linhKhi: 20, inventory: { thanh_linh_thao: 8, ngung_lo: 4 } },
    status: 'alive',
    craftFeedback: null,
    quests: {},
  });
  const travel = vi.fn(),
    stop = EventBus.on('cmd:travel', travel);
  const click = (selector: string) =>
    act(() => host.querySelector<HTMLButtonElement>(selector)!.click());
  try {
    act(() => root.render(<AlchemyPanel />));
    expect(host.querySelector('.alchemy-furnace-art')).not.toBeNull();
    click('#alchemy-tab-brew');
    click('.alchemy-quantity button:last-child');
    expect(host.querySelector<HTMLInputElement>('.alchemy-quantity input')!.value).toBe('4');
    expect(host.querySelector('.alchemy-materials')!.textContent).toContain('8/8');
    click('.alchemy-recipe-detail footer button');
    expect(gameStore.getState().player.inventory.hoi_xuan_dan).toBe(4);
    expect(host.querySelector('[role=status]')!.textContent).toContain('×4');
    expect(host.querySelector('footer [role=status]')).not.toBeNull();
    click('#alchemy-tab-pills');
    expect(host.querySelector('.alchemy-pill-cabinet article h4')!.textContent).toContain('×4');
    click('#alchemy-tab-recipes');
    expect(host.querySelectorAll('.alchemy-formula')).toHaveLength(3);
    click('.alchemy-formula:last-child');
    expect(host.querySelector('.alchemy-recipe-detail')!.getAttribute('data-recipe')).toBe(
      'pha_canh_dan',
    );
    expect(host.querySelector('.craft-availability')!.textContent).toContain('Cần Lv.5');
    click('#alchemy-tab-herbs');
    click('.alchemy-source button');
    expect(travel).toHaveBeenCalledWith('dai_thua_vien');
    expect(gameStore.getState().menu).toBeNull();
  } finally {
    stop();
    act(() => root.unmount());
    gameStore.setState(previous);
  }
});
