import { db } from "@/db";
import { notFound } from "next/navigation";
import DesignPreview from "./DesignPreview";

interface PreviewProps {
	searchParams: { [key: string]: string | string[] | undefined };
}

async function Preview({ searchParams }: PreviewProps) {
	const { id } = searchParams;

	if (!id || typeof id !== "string") {
		return notFound();
	}

	const configuration = await db.configuration.findUnique({
		where: { id },
	});

	if (!configuration) {
		return notFound();
	}

	return <DesignPreview configuration={configuration}></DesignPreview>;
}

export default Preview;
