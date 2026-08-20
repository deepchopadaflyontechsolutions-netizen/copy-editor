import CreativeFlowApp from "@/components/creativeflow/CreativeFlowApp";

export default async function CropResizePage(props: PageProps<"/crop-resize">) {
  const { assetId } = await props.searchParams;
  const assetIdParam = Array.isArray(assetId) ? assetId[0] : assetId;

  return <CreativeFlowApp initialTool="crop" initialAssetId={assetIdParam ?? null} />;
}
