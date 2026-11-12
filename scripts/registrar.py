#!/usr/bin/env python3
"""Guarda una foto del dólar en Bolivia en datos/historial.csv.
Fuentes: bo.dolarapi.com (oficial y Binance) y criptoya.com (exchanges P2P).
Uso: python3 -I scripts/registrar.py datos
"""
import csv, json, sys, urllib.request
from datetime import datetime, timezone
from pathlib import Path

UA = {'User-Agent': 'BsCambio/1.0 (+https://github.com/NeckHurtttt/BsCambio)'}
CAMPOS = ['fecha', 'oficial_compra', 'oficial_venta', 'paralelo_compra', 'paralelo_venta', 'fuente']


def leer(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return json.load(r)


def main():
    salida = Path(sys.argv[1] if len(sys.argv) > 1 else 'datos')
    salida.mkdir(parents=True, exist_ok=True)
    fila = {'fecha': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%MZ')}
    try:
        d = {x['casa']: x for x in leer('https://bo.dolarapi.com/v1/dolares')}
        fila |= {'oficial_compra': d['oficial']['compra'], 'oficial_venta': d['oficial']['venta']}
        if 'binance' in d:
            fila |= {'paralelo_compra': d['binance']['compra'], 'paralelo_venta': d['binance']['venta'], 'fuente': 'dolarapi/binance'}
    except Exception as e:
        print('dolarapi falló:', e)
    if 'paralelo_venta' not in fila:
        try:
            b = leer('https://criptoya.com/api/binancep2p/USDT/BOB/1')
            fila |= {'paralelo_compra': b['bid'], 'paralelo_venta': b['ask'], 'fuente': 'criptoya/binancep2p'}
        except Exception as e:
            print('criptoya falló:', e)
    if 'paralelo_venta' not in fila and 'oficial_venta' not in fila:
        sys.exit('sin datos')
    archivo = salida / 'historial.csv'
    nuevo = not archivo.exists()
    with archivo.open('a', newline='') as f:
        w = csv.DictWriter(f, CAMPOS)
        if nuevo:
            w.writeheader()
        w.writerow({k: fila.get(k, '') for k in CAMPOS})
    try:  # exchanges para la tabla de la página
        ex = leer('https://criptoya.com/api/usdt/bob/1')
        (salida / 'exchanges.json').write_text(json.dumps({'fecha': fila['fecha'], 'exchanges': ex}, ensure_ascii=False))
    except Exception as e:
        print('exchanges falló:', e)
    print(fila)


if __name__ == '__main__':
    main()
