"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  Bot,
  FolderTree,
  GitBranch,
  LayoutDashboard,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import useProject from "@/hooks/use-project";
import useRefetch from "@/hooks/use-refetch";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import {
  clearRepositoryCache,
  clearSavedProjectQuestions,
} from "@/lib/repository-cache";

const items = [
  {
    title: "Project Structure",
    url: "/repo-str",
    icon: FolderTree,
  },
  {
    title: "Ask LLM",
    url: "/qna",
    icon: Bot,
  },
  {
    title: "Issues & PRs",
    url: "/dashboard",
    icon: GitBranch,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { open } = useSidebar();
  const { projects, projectId, setProjectId } = useProject();
  const refetch = useRefetch();
  const deleteProject = api.project.deleteProject.useMutation();

  function handleDeleteProject(id: string) {
    deleteProject.mutate(
      { projectId: id },
      {
        onSuccess: (project) => {
          const deletedProject = projects?.find((item) => item.id === id);
          const repositoryStillInUse = projects?.some(
            (item) =>
              item.id !== id &&
              item.githubUrl.toLowerCase() ===
                deletedProject?.githubUrl.toLowerCase(),
          );
          if (deletedProject) clearSavedProjectQuestions(deletedProject.id);
          if (deletedProject && !repositoryStillInUse) {
            void clearRepositoryCache(deletedProject.githubUrl);
          }
          if (projectId === id) setProjectId("");
          toast.success(`${project.name} deleted`);
          void refetch();
        },
        onError: (error) => {
          toast.error(error.message || "Could not delete project");
        },
      },
    );
  }

  return (
    <Sidebar collapsible="icon" variant="floating">
      <SidebarHeader>
        <div className="flex items-center gap-4">
          <Image
            src="/logo.png"
            alt="Logo"
            width={35}
            height={35}
            className="h-10 min-h-8 w-10 min-w-8 shrink-0 object-contain"
          />
          {open && (
            <h1 className="text-primary/90 inline-block scale-x-110 scale-y-220 font-black">
              OSS Contribution Lab
            </h1>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="mb-1 text-base">
            Application
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link
                      href={item.url}
                      className={cn({
                        "bg-primary! text-white!": pathname === item.url,
                      })}
                    >
                      <item.icon />
                      <span className="text-base">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="mb-1 text-base">
            Your Projects
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projects?.map((project) => {
                return (
                  <SidebarMenuItem
                    key={project.id}
                    className="flex items-center gap-1"
                  >
                    <SidebarMenuButton
                      type="button"
                      className="w-auto min-w-0 flex-1"
                      isActive={project.id === projectId}
                      onClick={() => setProjectId(project.id)}
                    >
                      <div
                        className={cn(
                          "text-primary flex size-6 shrink-0 items-center justify-center rounded-sm border bg-white object-contain text-sm",
                          {
                            "bg-primary text-white": project.id === projectId,
                          },
                        )}
                      >
                        {project.name[0]}
                      </div>
                      <span className="text-base">{project.name}</span>
                    </SidebarMenuButton>
                    {open && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground hover:text-destructive shrink-0"
                            aria-label={`Delete ${project.name}`}
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete {project.name}?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This removes the project from your workspace and
                              hides its commit history.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              variant="destructive"
                              disabled={deleteProject.isPending}
                              onClick={() => handleDeleteProject(project.id)}
                            >
                              {deleteProject.isPending
                                ? "Deleting…"
                                : "Delete project"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </SidebarMenuItem>
                );
              })}
              <div className="h-2"></div>
              {open && (
                <SidebarMenuItem>
                  <Link href="/create">
                    <Button
                      className="flex w-full items-center gap-2"
                      variant="outline"
                    >
                      <Plus />
                      <span className="text-base">Create Project</span>
                    </Button>
                  </Link>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
