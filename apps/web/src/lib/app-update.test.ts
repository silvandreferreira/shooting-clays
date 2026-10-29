import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** A fake `navigator.serviceWorker`, with or without a version already in control. */
function fakeServiceWorker(controlled: boolean) {
  const container = new EventTarget() as EventTarget & {
    controller: object | null;
    register: ReturnType<typeof vi.fn>;
  };
  const registration = { update: vi.fn().mockResolvedValue(undefined) };
  container.controller = controlled ? {} : null;
  container.register = vi.fn().mockResolvedValue(registration);
  Object.defineProperty(navigator, 'serviceWorker', { value: container, configurable: true });
  return { container, registration };
}

// R59: a new deployment reaches an app left open (decision #78).
describe('registerServiceWorker', () => {
  const reload = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    reload.mockReset();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload },
      configurable: true,
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'serviceWorker');
  });

  async function start(controlled: boolean) {
    const fake = fakeServiceWorker(controlled);
    const { registerServiceWorker } = await import('./app-update');
    registerServiceWorker();
    await Promise.resolve();
    await Promise.resolve();
    return fake;
  }

  it('looks for a new version when the app comes back to the screen', async () => {
    const { registration } = await start(true);
    expect(registration.update).not.toHaveBeenCalled();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(registration.update).toHaveBeenCalledTimes(1);
  });

  it('reloads once when a new version takes control', async () => {
    const { container } = await start(true);
    container.dispatchEvent(new Event('controllerchange'));
    container.dispatchEvent(new Event('controllerchange'));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not reload on the first install (nothing older was running)', async () => {
    const { container } = await start(false);
    container.dispatchEvent(new Event('controllerchange'));
    expect(reload).not.toHaveBeenCalled();
  });
});
