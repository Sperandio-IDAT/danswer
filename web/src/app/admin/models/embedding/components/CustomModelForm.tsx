import {
  BooleanFormField,
  TextFormField,
} from "@/components/admin/connectors/Field";
import { Button } from "@tremor/react";
import { Form, Formik } from "formik";
import * as Yup from "yup";
import { EmbeddingModelDescriptor } from "./types";

export function CustomModelForm({
  onSubmit,
}: {
  onSubmit: (model: EmbeddingModelDescriptor) => void;
}) {
  return (
    <div>
      <Formik
        initialValues={{
          model_name: "",
          model_dim: "",
          query_prefix: "",
          passage_prefix: "",
          normalize: true,
        }}
        validationSchema={Yup.object().shape({
          model_name: Yup.string().required(
            "Please enter the name of the Embedding Model"
          ),
          model_dim: Yup.number().required(
            "Please enter the dimensionality of the embeddings generated by the model"
          ),
          query_prefix: Yup.string(),
          passage_prefix: Yup.string(),
          normalize: Yup.boolean().required(),
        })}
        onSubmit={async (values, formikHelpers) => {
          // onSubmit({ ...values, description: "", model_dim: parseInt(values.model_dim) });
        }}
      >
        {({ isSubmitting, setFieldValue }) => (
          <Form>
            <TextFormField
              name="model_name"
              label="Name:"
              subtext="The name of the model on Hugging Face"
              placeholder="E.g. 'intfloat/e5-base-v2'"
              autoCompleteDisabled={true}
            />

            <TextFormField
              name="model_dim"
              label="Model Dimension:"
              subtext="The dimensionality of the embeddings generated by the model"
              placeholder="E.g. '768'"
              autoCompleteDisabled={true}
              onChange={(e) => {
                const value = e.target.value;
                // Allow only integer values
                if (value === "" || /^[0-9]+$/.test(value)) {
                  setFieldValue("model_dim", value);
                }
              }}
            />
            <TextFormField
              name="query_prefix"
              label="[Optional] Query Prefix:"
              subtext={
                <>
                  The prefix specified by the model creators which should be
                  prepended to <i>queries</i> before passing them to the model.
                  Many models do not have this, in which case this should be
                  left empty.
                </>
              }
              placeholder="E.g. 'query: '"
              autoCompleteDisabled={true}
            />
            <TextFormField
              name="passage_prefix"
              label="[Optional] Passage Prefix:"
              subtext={
                <>
                  The prefix specified by the model creators which should be
                  prepended to <i>passages</i> before passing them to the model.
                  Many models do not have this, in which case this should be
                  left empty.
                </>
              }
              placeholder="E.g. 'passage: '"
              autoCompleteDisabled={true}
            />

            <BooleanFormField
              name="normalize"
              label="Normalize Embeddings"
              subtext="Whether or not to normalize the embeddings generated by the model. When in doubt, leave this checked."
            />

            <div className="flex mt-6">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-64 mx-auto"
              >
                Choose
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
}
