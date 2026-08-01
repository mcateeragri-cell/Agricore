import { DiagnosticParser } from "./parser";

const parsers: DiagnosticParser[] = [];

export function registerParser(parser: DiagnosticParser) {
    parsers.push(parser);
}

export function getRegisteredParsers() {
    return parsers;
}