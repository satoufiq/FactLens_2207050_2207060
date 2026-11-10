import ipaddress
import socket
from urllib.parse import urlparse

# Private / reserved IPv4 & IPv6 networks
PRIVATE_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]

def is_safe_url(url: str) -> bool:
    """
    Validates URL safety:
    - Must use HTTP or HTTPS scheme
    - Hostname must resolve to a public IP address (SSRF protection)
    - Rejects localhost and internal network destinations
    """
    if not url or not isinstance(url, str):
        return False

    try:
        parsed = urlparse(url.strip())
        if parsed.scheme.lower() not in ("http", "https"):
            return False

        hostname = parsed.hostname
        if not hostname:
            return False

        # Reject common localhost aliases
        if hostname.lower() in ("localhost", "127.0.0.1", "0.0.0.0", "::1", "local"):
            return False

        # Try to resolve IP and check if private
        try:
            addr_info = socket.getaddrinfo(hostname, None)
            for item in addr_info:
                ip_str = item[4][0]
                ip_obj = ipaddress.ip_address(ip_str)
                for net in PRIVATE_NETWORKS:
                    if ip_obj in net:
                        return False
        except socket.gaierror:
            # Cannot resolve DNS
            return False

        return True
    except Exception:
        return False

