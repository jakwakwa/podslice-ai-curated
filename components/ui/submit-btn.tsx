import { CheckIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function SubmitBtn({ isUpdating, handleSaveAll }: { isUpdating: boolean; handleSaveAll: React.MouseEventHandler<HTMLButtonElement> }): React.ReactElement {
	return (
		<div className="flex justify-end">
			<Button onClick={handleSaveAll} disabled={isUpdating} className="flex items-center gap-2" variant="default">
				{isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" aria-checked={true} aria-label="Save Preferences" />}
				Save
			</Button>
		</div>
	);
}

export default SubmitBtn;
