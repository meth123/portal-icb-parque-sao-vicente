import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ClipboardCheck,
  FileCheck2,
  HeartHandshake,
  Megaphone,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import { buttonClassName } from "@/components/ui/button";

const steps = [
  {
    title: "Reunião",
    description:
      "Informe data e formato. O Líder e os Vices da célula já aparecem para você apenas marcar quem esteve presente.",
    icon: CalendarDays,
  },
  {
    title: "Membros",
    description:
      "Digite somente os nomes. Para ganhar tempo, abra o Modo rápido e cole uma pessoa em cada linha.",
    icon: UsersRound,
  },
  {
    title: "Convidados",
    description:
      "Agrupe cada convidado pelo responsável e use o botão 1ª vez. Não numere nem escreva observações junto ao nome.",
    icon: UserRoundPlus,
  },
  {
    title: "Evangelismo",
    description:
      "Registre quem participou, quando aconteceu, quanto tempo durou e um breve relato da missão.",
    icon: Megaphone,
  },
] as const;

const evangelismGuide = [
  {
    title: "Liderança da sua célula",
    description:
      "Marque em Equipe da missão o Líder ou Vice que evangelizou junto.",
  },
  {
    title: "Outros integrantes",
    description:
      "Digite em Integrantes qualquer outra pessoa, inclusive Líder ou Vice de outra célula, sempre um nome por linha.",
  },
  {
    title: "Detalhes da missão",
    description:
      "Informe data, tempo e como foi. Se houve outra ação, crie um novo registro.",
  },
  {
    title: "Quando não aconteceu",
    description:
      "Escolha Não evangelizou e informe o motivo para concluir a resposta da semana.",
  },
] as const;

export function ReportTutorialCard() {
  return (
    <section className="mt-10" aria-labelledby="report-tutorial-card-title">
      <div className="grid overflow-hidden rounded-2xl border border-theme-primary-border bg-surface lg:grid-cols-[1.15fr_0.85fr]">
        <div className="p-5 sm:p-7">
          <div className="flex items-center gap-2 text-sm font-semibold text-theme-primary-active">
            <ClipboardCheck aria-hidden="true" className="h-5 w-5" />
            Guia da Ficha
          </div>
          <h2
            id="report-tutorial-card-title"
            className="mt-3 text-2xl font-semibold leading-8 text-app-foreground"
          >
            Preencha com segurança, sem retrabalho.
          </h2>
          <p className="mt-2 max-w-xl leading-7 text-app-secondary">
            O ICB Conecta organiza nomes, presenças e o PDF para poupar seu
            tempo e fortalecer o cuidado do ministério.
          </p>
          <p className="mt-3 text-sm font-medium text-theme-primary-active">
            Organização também é uma forma de servir e glorificar a Deus.
          </p>
        </div>

        <div className="border-t border-theme-primary-border bg-theme-primary-subtle p-5 sm:p-7 lg:border-l lg:border-t-0">
          <ul className="space-y-3 text-sm leading-5 text-app-foreground">
            <li className="flex gap-2">
              <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              Líder e Vices já aparecem identificados.
            </li>
            <li className="flex gap-2">
              <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              Nomes entram sem numeração, um por linha.
            </li>
            <li className="flex gap-2">
              <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              Evangelismo explicado com exemplos práticos.
            </li>
          </ul>
          <Link
            href="/portal/relatorios/guia"
            className={buttonClassName({ className: "mt-5 w-full sm:w-auto" })}
          >
            Ver tutorial completo
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function ReportTutorialGuide() {
  return (
    <section className="mt-6" aria-labelledby="report-guide-title">
      <div className="overflow-hidden rounded-2xl border border-theme-primary-border bg-surface">
        <header className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.65fr)] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-theme-primary-active">
              <ClipboardCheck aria-hidden="true" className="h-5 w-5" />
              Guia da Ficha
            </div>
            <h2
              id="report-guide-title"
              className="mt-3 max-w-2xl text-2xl font-semibold leading-8 text-app-foreground sm:text-3xl sm:leading-10"
            >
              Preencha uma vez. O ICB Conecta organiza o restante.
            </h2>
            <p className="mt-3 max-w-2xl leading-7 text-app-secondary">
              As regras evitam correções depois e transformam cada Ficha em
              informação confiável. Você economiza tempo, a liderança acompanha
              melhor e o ministério pode cuidar das pessoas com mais clareza.
            </p>
          </div>

          <div className="rounded-xl bg-theme-primary-subtle p-4 sm:p-5">
            <p className="font-semibold text-app-foreground">
              O sistema cuida da organização
            </p>
            <ul className="mt-3 space-y-3 text-sm leading-5 text-app-secondary">
              <li className="flex gap-2">
                <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                Líder e Vices já identificados.
              </li>
              <li className="flex gap-2">
                <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                Rascunho salvo automaticamente.
              </li>
              <li className="flex gap-2">
                <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                Listas e PDF formatados no final.
              </li>
            </ul>
          </div>
        </header>

        <div className="border-t border-app-border px-5 py-7 sm:px-7">
          <p className="text-sm font-semibold text-theme-primary-active">
            PASSO A PASSO
          </p>
          <h3 className="mt-1 text-xl font-semibold text-app-foreground">
            Quatro etapas, cada informação no seu lugar
          </h3>

          <ol className="mt-6 grid gap-x-7 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => {
              const StepIcon = step.icon;

              return (
                <li key={step.title} className="flex gap-3 lg:block">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-theme-primary-soft text-theme-primary-active">
                    <StepIcon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 lg:mt-3">
                    <p className="text-xs font-semibold text-theme-primary-active">
                      ETAPA {index + 1}
                    </p>
                    <h4 className="mt-1 font-semibold text-app-foreground">
                      {step.title}
                    </h4>
                    <p className="mt-1 text-sm leading-5 text-app-secondary">
                      {step.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="grid border-t border-theme-primary-border md:grid-cols-[0.8fr_1.2fr]">
          <div className="bg-surface-muted p-5 sm:p-7">
            <p className="text-sm font-semibold text-app-secondary">
              Antes, no Google Forms
            </p>
            <p className="mt-3 text-lg font-semibold text-app-foreground">
              “1 - Marcos 1ª vez”
            </p>
            <p className="mt-2 text-sm leading-6 text-app-secondary">
              Era preciso numerar, escrever observações junto ao nome e
              digitar novamente Líder e Vices. Pequenas diferenças geravam
              retrabalho e dificultavam o acompanhamento.
            </p>
          </div>
          <div className="bg-theme-primary-subtle p-5 sm:p-7">
            <div className="flex items-center gap-2 text-sm font-semibold text-theme-primary-active">
              <FileCheck2 aria-hidden="true" className="h-5 w-5" />
              Agora, no ICB Conecta
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <p className="text-sm leading-6 text-app-foreground">
                <strong className="block">Somente o nome</strong>
                Use letras e espaços, sem números ou símbolos.
              </p>
              <p className="text-sm leading-6 text-app-foreground">
                <strong className="block">Um por linha</strong>
                O Modo rápido organiza listas sem numeração.
              </p>
              <p className="text-sm leading-6 text-app-foreground">
                <strong className="block">Use as marcações</strong>
                Primeira vez e presenças ficam em campos próprios.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-theme-primary-active px-5 py-7 text-theme-primary-foreground sm:px-7 sm:py-8">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/12">
              <Megaphone aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white/70">
                EVANGELISMO SEM DÚVIDA
              </p>
              <h3 className="mt-1 text-xl font-semibold">
                Um registro representa uma ação de evangelismo
              </h3>
            </div>
          </div>

          <ol className="mt-6 grid gap-x-7 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
            {evangelismGuide.map((item, index) => (
              <li key={item.title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-theme-primary-active">
                  {index + 1}
                </span>
                <div>
                  <h4 className="font-semibold">{item.title}</h4>
                  <p className="mt-1 text-sm leading-5 text-white/75">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <p className="mt-6 border-t border-white/15 pt-5 text-sm font-medium leading-6 text-white/90">
            Evangelizaram juntos? Use um só registro e marque todos. Foram
            ações diferentes? Crie registros separados.
          </p>
        </div>

        <footer className="flex items-start gap-3 border-t border-app-border bg-success-soft p-5 sm:px-7 sm:py-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-success">
            <HeartHandshake aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-app-foreground">
              Organização também é cuidado
            </p>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-app-secondary">
              Quando cada pessoa registra bem a sua parte, todos são
              beneficiados, o ministério é fortalecido e Deus é glorificado por
              um trabalho feito com fidelidade, decência e ordem.
            </p>
          </div>
        </footer>
      </div>
    </section>
  );
}
