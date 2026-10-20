"""Compresión sencilla (LZ77) + base64 para meter imágenes y datos binarios en módulos Luau.

Formato LZ (byte a byte):
  t < 128   -> literal: siguen t+1 bytes tal cual
  t >= 128  -> copia: longitud (t-128)+3, luego 2 bytes de distancia (little endian, 1..65535)
El decodificador está en src/compartido/Codec.luau.
"""
import base64


def comprimir(datos: bytes) -> bytes:
    n = len(datos)
    salida = bytearray()
    literales = bytearray()
    tabla = {}

    def vaciar():
        nonlocal literales
        p = 0
        while p < len(literales):
            trozo = literales[p:p + 128]
            salida.append(len(trozo) - 1)
            salida.extend(trozo)
            p += 128
        literales = bytearray()

    i = 0
    mv = memoryview(datos)
    while i < n:
        mejor_l, mejor_d = 0, 0
        if i + 3 <= n:
            clave = bytes(mv[i:i + 3])
            cands = tabla.get(clave)
            if cands:
                for j in reversed(cands[-24:]):
                    d = i - j
                    if d > 65535:
                        break
                    l = 3
                    lim = min(130, n - i)
                    while l < lim and datos[j + l] == datos[i + l]:
                        l += 1
                    if l > mejor_l:
                        mejor_l, mejor_d = l, d
                        if l == lim:
                            break
            tabla.setdefault(clave, []).append(i)
        if mejor_l >= 4:
            vaciar()
            salida.append(128 + mejor_l - 3)
            salida.append(mejor_d & 255)
            salida.append(mejor_d >> 8)
            for k in range(i + 1, min(i + mejor_l, n - 2)):
                tabla.setdefault(bytes(mv[k:k + 3]), []).append(k)
            i += mejor_l
        else:
            literales.append(datos[i])
            i += 1
    vaciar()
    return bytes(salida)


def descomprimir(src: bytes, tam: int) -> bytes:
    out = bytearray()
    i = 0
    while i < len(src):
        t = src[i]
        i += 1
        if t < 128:
            out.extend(src[i:i + t + 1])
            i += t + 1
        else:
            l = t - 128 + 3
            d = src[i] | (src[i + 1] << 8)
            i += 2
            for _ in range(l):
                out.append(out[-d])
    assert len(out) == tam, (len(out), tam)
    return bytes(out)


def a_texto(datos: bytes) -> str:
    """Comprime y pasa a base64."""
    c = comprimir(datos)
    assert descomprimir(c, len(datos)) == datos
    return base64.b64encode(c).decode('ascii')
