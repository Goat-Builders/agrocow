"""CLI de prueba del motor AgroTrack CV.

Uso:
    python test_cv_engine.py --input uploads/input.mp4 --output outputs/output.mp4 [--json outputs/result.json]
"""

from __future__ import annotations

import argparse
import json
import sys

from agrotrack_cv.engine import AgroTrackEngine


def main() -> int:
    parser = argparse.ArgumentParser(description="Prueba del motor AgroTrack CV")
    parser.add_argument("--input", required=True, help="Video de entrada")
    parser.add_argument("--output", default="outputs/output.mp4", help="MP4 anotado de salida")
    parser.add_argument("--json", default=None, help="Ruta opcional para guardar el resultado completo")
    args = parser.parse_args()

    result = AgroTrackEngine().process_video(input_path=args.input, output_path=args.output)

    video, summary = result["video"], result["summary"]
    print(f"Video: {video['width']}x{video['height']} @ {video['fps']} fps, "
          f"{video['total_frames']} frames ({video['duration_sec']} s), codec={video['codec']}")
    print(f"Animales únicos: {summary['unique_animals']} | máx. simultáneos: {summary['max_heads']} "
          f"| promedio: {summary['avg_heads']}")
    for zone, st in result["zones"].items():
        print(f"  {zone}: visitas={st['total_visits']} animales={st['unique_animals']} "
              f"permanencia={st['total_dwell_sec']} s (prom/visita {st['avg_dwell_per_visit_sec']} s)")
    print(f"Eventos: {summary['total_events']} ({summary['critical_events']} críticos)")
    for ev in result["events"]:
        print(f"  [{ev['severity']}] {ev['event_type']} track={ev['track_id']} "
              f"{ev['start_timestamp_sec']}s-{ev['end_timestamp_sec']}s: {ev['description']}")
    print(f"Video anotado: {args.output}")

    if args.json:
        with open(args.json, "w", encoding="utf-8") as fh:
            json.dump(result, fh, ensure_ascii=False, indent=2)
        print(f"JSON: {args.json}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
