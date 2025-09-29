import type React from "react";
import { AppSpinner } from "./app-spinner";

function ComponentSpinner({ isLabel = false }: { isLabel?: boolean }): React.ReactElement {
	return <AppSpinner variant="dots" label={isLabel ? "Loading..." : undefined} size="md" color="primary" />;
}

export default ComponentSpinner;
