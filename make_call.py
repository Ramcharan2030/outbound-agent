import argparse
import asyncio
import logging
import os

from outbound_calls import dispatch_outbound_call

logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO),
    format="%(asctime)s.%(msecs)03d %(levelname)s %(name)s [pid=%(process)d] %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)


async def main() -> int:
    parser = argparse.ArgumentParser(description="Make an outbound call via LiveKit Agent.")
    parser.add_argument("--to", required=True, help="The phone number to call (e.g., +91...)")
    parser.add_argument("--name", default="", help="Optional caller/contact name metadata")
    args = parser.parse_args()

    print(f"Initiating call to {args.to.strip()}...")

    try:
        result = await dispatch_outbound_call(
            args.to,
            caller_name=args.name.strip(),
        )
        print("\nCall dispatched successfully.")
        print(f"Dispatch ID: {result['dispatch_id']}")
        print(f"Session Room: {result['room']}")
        print(f"SIP Trunk: {result['sip_trunk_id']}")
        print("-" * 40)
        print("The agent is now joining the room and will dial the number.")
        print("Check your agent terminal for logs.")
        return 0
    except Exception as exc:
        print(f"\nError dispatching call: {type(exc).__name__}: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
