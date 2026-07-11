"""Exercise the MCP server as a real client would -- spawns it as a subprocess
over stdio (the actual transport `app/mcp/server.py` runs), not an in-process
shortcut. Useful because stdio transport speaks framed JSON-RPC, not plain
text: running the server directly in a terminal and typing at it does nothing
useful. This script spawns the server for you via the MCP SDK's stdio client,
so there's no separate "start the server" step.

Usage (from backend/):
    ./venv/Scripts/python.exe scripts/test_mcp_client.py [transaction_id]

Defaults to transaction_id=1613 (a real flagged transaction in the seeded
data) if none is given.
"""

import asyncio
import json
import sys
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

BACKEND_DIR = Path(__file__).resolve().parents[1]
PYTHON = str(BACKEND_DIR / "venv" / "Scripts" / "python.exe")

DEFAULT_TRANSACTION_ID = 1613


async def main(transaction_id: int) -> None:
    server_params = StdioServerParameters(
        command=PYTHON,
        args=["-m", "app.mcp.server"],
        cwd=str(BACKEND_DIR),
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            tools = await session.list_tools()
            print(f"Available tools ({len(tools.tools)}):")
            for tool in tools.tools:
                print(f"  - {tool.name}")
            print()

            print(f"Calling generate_audit_note(transaction_id={transaction_id}) ...")
            result = await session.call_tool(
                "generate_audit_note", {"transaction_id": transaction_id}
            )

            for block in result.content:
                if block.type == "text":
                    data = json.loads(block.text)
                    print(json.dumps(data, indent=2))
                    if "error" in data:
                        print(f"\n-> Tool returned an error: {data['error']}")
                    else:
                        print(f"\n-> Success: audit_notes row id={data['id']} created for "
                              f"transaction {data['transaction_id']}, status={data['status']}")


if __name__ == "__main__":
    tx_id = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_TRANSACTION_ID
    asyncio.run(main(tx_id))
