import { describe, expect, it } from 'vitest';
import { normalizeRoomCode, parseClientMessage, ROOM_CODE_RE } from './protocol';

describe('protocolo', () => {
  it('acepta mensajes válidos', () => {
    expect(parseClientMessage('{"t":"hello","v":1,"name":"Ana"}')).toEqual({ t: 'hello', v: 1, name: 'Ana', token: undefined });
    expect(parseClientMessage('{"t":"shoot","shotId":1,"tick":10,"dx":0,"dz":-1,"power":0.5}')).toMatchObject({ t: 'shoot', power: 0.5 });
    expect(parseClientMessage('{"t":"set_ready","ready":true}')).toEqual({ t: 'set_ready', ready: true });
  });
  it('rechaza basura, tipos incorrectos y valores no finitos', () => {
    expect(parseClientMessage('no json')).toBeNull();
    expect(parseClientMessage('[1,2]')).toBeNull();
    expect(parseClientMessage('{"t":"desconocido"}')).toBeNull();
    expect(parseClientMessage('{"t":"shoot","shotId":1,"tick":10,"dx":"0","dz":-1,"power":0.5}')).toBeNull();
    expect(parseClientMessage('{"t":"shoot","shotId":1,"tick":10,"dx":0,"dz":-1,"power":1e999}')).toBeNull();
    expect(parseClientMessage('{"t":"set_ready","ready":"si"}')).toBeNull();
    expect(parseClientMessage(JSON.stringify({ t: 'hello', v: 1, name: 'x'.repeat(100) }))).toBeNull();
  });
  it('códigos de sala', () => {
    expect(normalizeRoomCode(' ab-c2 3 ')).toBe('ABC23');
    expect(ROOM_CODE_RE.test('ABC23')).toBe(true);
    expect(ROOM_CODE_RE.test('ABC0O')).toBe(false);
    expect(ROOM_CODE_RE.test('ABC2')).toBe(false);
  });
});
