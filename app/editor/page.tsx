import CreativeFlowApp from "@/components/creativeflow/CreativeFlowApp";
import { isEditIntentId } from "@/types/editIntent";

export default async function EditorPage(props: PageProps<"/editor">) {
  const { tool, assetId } = await props.searchParams;
  const toolParam = Array.isArray(tool) ? tool[0] : tool;
  const assetIdParam = Array.isArray(assetId) ? assetId[0] : assetId;

  return (
    <CreativeFlowApp
      initialTool={isEditIntentId(toolParam) ? toolParam : null}
      initialAssetId={assetIdParam ?? null}
    />
  );
}
