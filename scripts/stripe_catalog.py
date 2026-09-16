"""Create/verify the Whispering Palms catalog in one Stripe account.

    python3 stripe_catalog.py /path/to/key.txt [--coupon]

Idempotent: products are matched on metadata[plan], prices on lookup_key, so
re-running never creates duplicates. Used for the sandbox now and the live
account at launch, so both are provably identical.

Prices mirror lib/config/plans.ts, which is what the app charges against.
The key is read from a file and never printed.
"""
import json, sys, urllib.parse, urllib.request, urllib.error

KEY = open(sys.argv[1]).read().strip()
WANT_COUPON = '--coupon' in sys.argv
API = 'https://api.stripe.com/v1'

PLANS = {
    'spark':      ('Whispering Palms — Spark',      'Daily readings from your palm and birth chart.',  900,  7200),
    'flame':      ('Whispering Palms — Flame',      'More daily questions, narrated readings.',       2200, 17600),
    'superflame': ('Whispering Palms — SuperFlame', 'Unlimited questions and priority readings.',     3900, 31200),
}


def call(method, path, data=None):
    body = urllib.parse.urlencode(data, doseq=True).encode() if data else None
    req = urllib.request.Request(API + path, data=body, method=method)
    req.add_header('Authorization', 'Bearer ' + KEY)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return json.loads(e.read().decode())


acct = call('GET', '/account')
print(f"account: {acct.get('id')}  {acct.get('country')}/{acct.get('default_currency')}  "
      f"livemode={not KEY.startswith('sk_test')}")

for key, (name, desc, monthly, yearly) in PLANS.items():
    found = call('GET', '/products/search?' + urllib.parse.urlencode(
        {'query': f"metadata['plan']:'{key}'"}))
    prod = (found.get('data') or [None])[0]
    if not prod:
        prod = call('POST', '/products', {
            'name': name, 'description': desc, 'metadata[plan]': key})
        if 'error' in prod:
            print(f'  {key}: product ERROR {prod["error"]["message"]}'); continue
    print(f'  {key}: product {prod["id"]}')

    for period, amount, interval in (('monthly', monthly, 'month'), ('yearly', yearly, 'year')):
        lk = f'wp_{key}_{period}'
        ex = call('GET', '/prices?' + urllib.parse.urlencode(
            {'lookup_keys[]': lk, 'active': 'true', 'limit': 1}))
        price = (ex.get('data') or [None])[0]
        if price:
            print(f'      {lk}: {price["id"]} (exists, {price["unit_amount"]/100:.2f} {price["currency"]})')
            continue
        price = call('POST', '/prices', {
            'product': prod['id'], 'unit_amount': amount, 'currency': 'usd',
            'recurring[interval]': interval, 'lookup_key': lk})
        if 'error' in price:
            print(f'      {lk}: ERROR {price["error"]["message"]}')
        else:
            print(f'      {lk}: {price["id"]} (created, {price["unit_amount"]/100:.2f} usd/{interval})')

if WANT_COUPON:
    # 100% off for one billing period == one month free on a monthly plan.
    # duration=once applies to the first invoice only, so it renews at full price.
    coupons = call('GET', '/coupons?limit=100')
    coupon = next((c for c in coupons.get('data', []) if c.get('name') == 'One month free'), None)
    if not coupon:
        coupon = call('POST', '/coupons', {
            'percent_off': 100, 'duration': 'once', 'name': 'One month free'})
    print(f"coupon: {coupon.get('id')} ({coupon.get('percent_off')}% off, {coupon.get('duration')})")

    promos = call('GET', '/promotion_codes?' + urllib.parse.urlencode({'code': 'FREEMONTH', 'limit': 1}))
    promo = (promos.get('data') or [None])[0]
    if not promo:
        # Newer API versions nest the coupon under promotion[...]
        promo = call('POST', '/promotion_codes', {
            'promotion[type]': 'coupon', 'promotion[coupon]': coupon['id'], 'code': 'FREEMONTH'})
        if 'error' in promo:
            promo = call('POST', '/promotion_codes', {'coupon': coupon['id'], 'code': 'FREEMONTH'})
    if 'error' in promo:
        print(f"promo: ERROR {promo['error']['message']}")
    else:
        print(f"promo: {promo.get('id')} code={promo.get('code')} active={promo.get('active')}")
