#!/usr/bin/env python3
"""Generate blank counterbalanced forms or score a complete blinded study."""
import argparse
import csv
import json
from pathlib import Path
import random
import statistics

FIELDS = ['participant', 'prompt', 'position', 'sample', 'alive', 'natural']

def design():
    rng = random.Random(20261020)
    rows, key = [], []
    for prompt in range(1, 6):
        orders = ['old', 'v2'] * 5
        rng.shuffle(orders)
        for person, first in enumerate(orders, 1):
            participant = f'P{person:02}'
            for position, condition in enumerate([first, 'v2' if first == 'old' else 'old'], 1):
                sample = f'{participant}-Q{prompt}-{position}'
                rows.append(dict(participant=participant, prompt=str(prompt), position=str(position), sample=sample, alive='', natural=''))
                key.append(dict(sample=sample, condition=condition, clip=f'Q{prompt}-{condition}'))
    return sorted(rows, key=lambda r:(r['participant'],int(r['prompt']),int(r['position']))), key

def score(rows, key):
    expected, expected_key = design()
    if key != expected_key:
        raise ValueError('Allocation key differs from the frozen study design')
    if len(rows) != 100:
        raise ValueError('Exactly 100 ratings required: 10 people × 5 prompts × 2 conditions')
    lookup = {r['sample']:r for r in expected}
    conditions = {r['sample']:r['condition'] for r in key}
    seen, values = set(), {}
    for row in rows:
        sample = row['sample']
        if sample not in lookup or sample in seen:
            raise ValueError('Unknown or duplicate sample')
        seen.add(sample)
        for field in ['participant','prompt','position']:
            if row[field] != lookup[sample][field]:
                raise ValueError('Allocation mismatch')
        for metric in ['alive','natural']:
            if row[metric] not in ['1','2','3','4','5']:
                raise ValueError('Every rating must be an integer 1–5; blank scores are pending')
            values[(row['participant'],row['prompt'],conditions[sample],metric)] = int(row[metric])
    report = {'participants':10,'prompts':5,'ratings':100,'method':'Descriptive paired participant means; no significance or population claim.'}
    for metric in ['alive','natural']:
        old, new = [], []
        for person in range(1,11):
            participant=f'P{person:02}'
            old.append(statistics.mean(values[(participant,str(q),'old',metric)] for q in range(1,6)))
            new.append(statistics.mean(values[(participant,str(q),'v2',metric)] for q in range(1,6)))
        delta=[b-a for a,b in zip(old,new)]
        report[metric]={'oldMean':statistics.mean(old),'v2Mean':statistics.mean(new),'pairedMeanDelta':statistics.mean(delta),'participantDeltas':delta}
    return report

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('mode',choices=['prepare','score'])
    parser.add_argument('directory',type=Path)
    args=parser.parse_args()
    if args.mode=='prepare':
        args.directory.mkdir(parents=True,exist_ok=True)
        rows,key=design()
        # Never replace collected ratings or an existing allocation.
        with (args.directory/'ratings.csv').open('x',newline='') as f:
            writer=csv.DictWriter(f,fieldnames=FIELDS);writer.writeheader();writer.writerows(rows)
        with (args.directory/'ADMIN-allocation.json').open('x') as f:
            json.dump(key,f,indent=2);f.write('\n')
        print('Prepared 100 blank ratings and administrator-only allocation. No participant results exist.')
    else:
        with (args.directory/'ratings.csv').open(newline='') as f:
            rows=list(csv.DictReader(f))
        key=json.loads((args.directory/'ADMIN-allocation.json').read_text())
        print(json.dumps(score(rows,key),indent=2))

if __name__=='__main__':
    main()
