"use client";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import useRefetch from "@/hooks/use-refetch";
import useProject from "@/hooks/use-project";

type FormInput = {
  projectName: string;
  repoUrl: string;
  apiKey: string;
};

const CreateProjectPage = () => {
  const { register, handleSubmit, reset } = useForm<FormInput>();
  const createProject = api.project.createProject.useMutation();
  const refetch = useRefetch();
  const router = useRouter();
  const { setProjectId } = useProject();

  function onSubmit(data: FormInput) {
    createProject.mutate(
      {
        githubUrl: data.repoUrl,
        name: data.projectName,
        apiKey: data.apiKey,
      },
      {
        onSuccess: async (project) => {
          toast.success("Project created successfully");
          await refetch();
          setProjectId(project.id);
          reset();
          router.push("/repo-str");
        },
        onError: () => {
          toast.error("Failed to create project");
        },
      },
    );
    return true;
  }

  return (
    <div className="flex h-full items-center justify-center gap-12">
      <Image
        src="/undraw-github.png"
        alt="GitHub repository illustration"
        width={400}
        height={240}
        className="mr-10 h-60 w-auto"
      />
      <div>
        <div>
          <h1 className="text-2xl font-semibold">
            Link Your GitHub Repository
          </h1>
          <p className="text-muted-foreground text-sm">
            Enter the URL of your GitHub repository to link it to OSS
            Contribution Lab
          </p>
        </div>
        <div className="h-4"></div>
        <div>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Input
              {...register("projectName", { required: true })}
              placeholder="Project Name"
              required
            />
            <div className="h-2"></div>
            <Input
              {...register("repoUrl", { required: true })}
              placeholder="URL of GitHub repository"
              type="url"
              required
            />
            <div className="h-2"></div>
            <Input
              {...register("apiKey", { required: true })}
              placeholder="Gemini API key (or OpenAI key)"
              type="password"
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Repository search uses Gemini embeddings. If you use an OpenAI key for answers, configure GEMINI_API_KEY on the server.
            </p>
            <div className="h-4"></div>
            <Button type="submit" disabled={createProject.isPending}>
              Create Project
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateProjectPage;
