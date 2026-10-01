import { getProductById } from "@/lib/firestore";
import { notFound } from "next/navigation";
import ProductForm from "@/components/ProductForm";

export default async function EditProductPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await getProductById(params.id);
  if (!product) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Edit Product</h1>
      <ProductForm initialData={product} />
    </div>
  );
}
