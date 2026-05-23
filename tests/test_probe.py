import json
import unittest

from monitor.probe import MSG_PUBMSG, encode_message, parse_joinmarket_payload


class ProbeParsingTest(unittest.TestCase):
    def test_parse_orderbook_payload(self) -> None:
        own_nick = "J5monitorNick123"
        payload = (
            "J5makerNickABC!J5monitorNick123!"
            "sw0absoffer 0 100000 5000000 0 100!"
            "tbond 0123456789abcdef"
        )

        offers, bonds = parse_joinmarket_payload(payload, own_nick)

        self.assertEqual(bonds, 1)
        self.assertEqual(len(offers), 1)
        self.assertEqual(offers[0]["counterparty"], "J5makerNickABC")
        self.assertEqual(offers[0]["ordertype"], "sw0absoffer")
        self.assertEqual(offers[0]["oid"], "0")

    def test_ignores_messages_for_other_nick(self) -> None:
        offers, bonds = parse_joinmarket_payload(
            "J5maker!J5other!sw0reloffer 1 100 200 0 0.0002",
            "J5mine",
        )

        self.assertEqual(offers, [])
        self.assertEqual(bonds, 0)

    def test_encode_message_is_json_line(self) -> None:
        encoded = encode_message(MSG_PUBMSG, "nick!PUBLIC!orderbook")

        self.assertTrue(encoded.endswith(b"\r\n"))
        self.assertEqual(
            json.loads(encoded.decode("utf-8")),
            {"type": MSG_PUBMSG, "line": "nick!PUBLIC!orderbook"},
        )


if __name__ == "__main__":
    unittest.main()
