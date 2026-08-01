import { ParsedDiagnosticReport } from "./types";

export interface DiagnosticParser {

    readonly name: string;

    canParse(
        filename: string,
        text: string,
        mimeType?: string
    ): Promise<boolean>;

    parse(
        filename: string,
        text: string
    ): Promise<ParsedDiagnosticReport>;
}