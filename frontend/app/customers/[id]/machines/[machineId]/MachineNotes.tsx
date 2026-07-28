import Card from "../../../../../Components/ui/Card";

type MachineNotesProps = {
  notes: string;
};

export default function MachineNotes({ notes }: MachineNotesProps) {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-bold">Machine notes</h2>

      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">
        {notes || "No machine notes have been added."}
      </p>
    </Card>
  );
}
