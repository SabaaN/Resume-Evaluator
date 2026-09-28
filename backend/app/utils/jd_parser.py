import io
import zipfile
import xml.etree.ElementTree as ET

from docx import Document


def extract_text_from_doc(file_bytes: bytes, extension: str) -> str:
    """Extract text from a legacy .doc or modern .docx Word document."""
    try:
        if extension == "docx":
            document = Document(io.BytesIO(file_bytes))
            parts = [paragraph.text for paragraph in document.paragraphs]
            parts.extend(
                cell.text
                for table in document.tables
                for row in table.rows
                for cell in row.cells
            )
            text = "\n".join(parts).strip()
        else:
            text = _extract_text_from_legacy_doc(file_bytes)
    except Exception as e:
        raise ValueError(f"Failed to parse Word document: {e}")

    if not text:
        raise ValueError("No extractable text found in Word document.")
    return text


def _extract_text_from_legacy_doc(file_bytes: bytes) -> str:
    """Read text from the WordDocument stream in a binary .doc file."""
    # Legacy .doc is an OLE compound file. Locate the WordDocument stream,
    # then decode its text using the piece table from the 0Table/1Table stream.
    import olefile

    ole = olefile.OleFileIO(io.BytesIO(file_bytes))
    try:
        table_name = "1Table" if ole.openstream("WordDocument").read(12)[10] & 0x02 else "0Table"
        word = ole.openstream("WordDocument").read()
        table = ole.openstream(table_name).read()
        fc_clx, lcb_clx = int.from_bytes(word[0x1A2:0x1A6], "little"), int.from_bytes(word[0x1A6:0x1AA], "little")
        clx = table[fc_clx:fc_clx + lcb_clx]
        pos = 0
        while pos < len(clx) and clx[pos] == 0x01:
            pos += 1 + int.from_bytes(clx[pos + 1:pos + 3], "little")
        if pos >= len(clx) or clx[pos] != 0x02:
            raise ValueError("Word document text table is invalid")
        plc = clx[pos + 1:]
        length = int.from_bytes(plc[:4], "little")
        piece_count = (length - 4) // 12
        cps_start = 4
        pcd_start = (piece_count + 1) * 4
        pieces = []
        for i in range(piece_count):
            cp_start = int.from_bytes(plc[cps_start + i * 4:cps_start + i * 4 + 4], "little")
            cp_end = int.from_bytes(plc[cps_start + (i + 1) * 4:cps_start + (i + 1) * 4 + 4], "little")
            pcd = plc[pcd_start + i * 8:pcd_start + (i + 1) * 8]
            raw_fc = int.from_bytes(pcd[2:6], "little")
            compressed = bool(raw_fc & 0x40000000)
            fc = (raw_fc & 0x3FFFFFFF) >> 1 if compressed else raw_fc & 0x3FFFFFFF
            size = cp_end - cp_start
            chunk = word[fc:fc + size * (1 if compressed else 2)]
            pieces.append(chunk.decode("cp1252" if compressed else "utf-16le", errors="replace"))
        return "\n".join(pieces).replace("\x00", "").strip()
    finally:
        ole.close()
