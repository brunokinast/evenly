// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Portuguese (`pt`).
class AppLocalizationsPt extends AppLocalizations {
  AppLocalizationsPt([String locale = 'pt']) : super(locale);

  @override
  String get appTitle => 'Evenly';

  @override
  String get settingUp => 'Configurando...';

  @override
  String failedToInitialize(String error) {
    return 'Falha ao inicializar: $error';
  }

  @override
  String get retry => 'Tentar novamente';

  @override
  String errorLoadingProfile(String error) {
    return 'Erro ao carregar perfil: $error';
  }

  @override
  String get welcomeTitle => 'Bem-vindo ao Evenly';

  @override
  String get welcomeSubtitle =>
      'Divida despesas de forma justa com amigos e família';

  @override
  String get whatsYourName => 'Qual é o seu nome?';

  @override
  String get enterYourName => 'Digite seu nome';

  @override
  String get pleaseEnterName => 'Por favor, digite seu nome';

  @override
  String get getStarted => 'Começar';

  @override
  String get myTrips => 'Minhas Viagens';

  @override
  String get noTripsYet => 'Nenhuma viagem ainda';

  @override
  String get createFirstTrip =>
      'Crie sua primeira viagem para começar a dividir despesas com amigos!';

  @override
  String get newTrip => 'Nova Viagem';

  @override
  String get pullToRefresh => 'Puxe para atualizar';

  @override
  String get createTrip => 'Criar Viagem';

  @override
  String get tripName => 'Nome da Viagem';

  @override
  String get enterTripName => 'Digite o nome da viagem';

  @override
  String get pleaseEnterTripName => 'Por favor, digite um nome para a viagem';

  @override
  String get currency => 'Moeda';

  @override
  String get create => 'Criar';

  @override
  String failedToCreateTrip(String error) {
    return 'Falha ao criar viagem: $error';
  }

  @override
  String get joinTrip => 'Entrar na Viagem';

  @override
  String get invalidInviteLink => 'Código de convite inválido ou expirado';

  @override
  String get goBack => 'Voltar';

  @override
  String get alreadyMemberOf => 'Você já é membro de';

  @override
  String get openTrip => 'Abrir Viagem';

  @override
  String get youreInvitedToJoin => 'Você foi convidado para';

  @override
  String get joining => 'Entrando...';

  @override
  String failedToJoinTrip(String error) {
    return 'Falha ao entrar na viagem: $error';
  }

  @override
  String get enterInviteCode => 'Digite o Código';

  @override
  String get enterInviteCodeHint =>
      'Peça o código de 6 dígitos ao dono da viagem';

  @override
  String get paste => 'Colar';

  @override
  String get validating => 'Validando...';

  @override
  String get findTrip => 'Buscar Viagem';

  @override
  String get invalidCodeFormat => 'Digite um código de 6 dígitos';

  @override
  String get invalidOrExpiredCode => 'Código de convite inválido ou expirado';

  @override
  String get enterDifferentCode => 'Digite outro código';

  @override
  String get inviteCode => 'Código de Convite';

  @override
  String get showInviteCode => 'Mostrar Código';

  @override
  String get shareCodeInstructions =>
      'Compartilhe este código com amigos para que possam entrar na viagem';

  @override
  String codeExpiresIn(String time) {
    return 'Expira em $time';
  }

  @override
  String get copyCode => 'Copiar Código';

  @override
  String get codeCopied => 'Código copiado!';

  @override
  String get regenerateCode => 'Gerar Novo Código';

  @override
  String get regenerateCodeConfirm =>
      'Gerar um novo código de convite? O código atual deixará de funcionar.';

  @override
  String get regenerate => 'Gerar Novo';

  @override
  String get codeRegenerated => 'Novo código gerado';

  @override
  String get members => 'Membros';

  @override
  String get expenses => 'Despesas';

  @override
  String get summary => 'Resumo';

  @override
  String get share => 'Compartilhar';

  @override
  String get addMember => 'Adicionar Membro';

  @override
  String get addExpense => 'Adicionar Despesa';

  @override
  String get exportPdf => 'Exportar PDF';

  @override
  String membersCount(int count) {
    return 'Membros ($count)';
  }

  @override
  String get noMembers => 'Nenhum membro ainda';

  @override
  String get youIndicator => '(Você)';

  @override
  String get owner => 'Dono';

  @override
  String get manualIndicator => '(manual)';

  @override
  String get removeMember => 'Remover Membro';

  @override
  String removeMemberConfirm(String name) {
    return 'Remover $name da viagem?';
  }

  @override
  String get cannotRemoveWithExpenses =>
      'Não é possível remover membro com despesas';

  @override
  String get remove => 'Remover';

  @override
  String get cancel => 'Cancelar';

  @override
  String get add => 'Adicionar';

  @override
  String get memberName => 'Nome do Membro';

  @override
  String get enterMemberName => 'Digite o nome do membro';

  @override
  String get pleaseEnterMemberName => 'Por favor, digite um nome para o membro';

  @override
  String get memberNameExists => 'Já existe um membro com este nome';

  @override
  String expensesCount(int count) {
    return 'Despesas ($count)';
  }

  @override
  String get noExpenses => 'Nenhuma despesa ainda';

  @override
  String get addFirstExpense => 'Adicione sua primeira despesa para começar!';

  @override
  String paidBy(String name) {
    return 'Pago por $name';
  }

  @override
  String splitBetween(int count) {
    return 'Dividido entre $count';
  }

  @override
  String get deleteExpense => 'Excluir Despesa';

  @override
  String deleteExpenseConfirm(String title) {
    return 'Excluir \"$title\"?';
  }

  @override
  String get delete => 'Excluir';

  @override
  String get description => 'Descrição';

  @override
  String get whatWasItFor => 'Qual foi o gasto?';

  @override
  String get pleaseEnterDescription => 'Por favor, digite uma descrição';

  @override
  String get amount => 'Valor';

  @override
  String get pleaseEnterAmount => 'Por favor, digite um valor';

  @override
  String get invalidAmount => 'Por favor, digite um valor válido';

  @override
  String get whoPaid => 'Quem Pagou?';

  @override
  String get selectWhoPaid => 'Selecione quem pagou';

  @override
  String get pleaseSelectWhoPaid => 'Por favor, selecione quem pagou';

  @override
  String get splitBetweenTitle => 'Dividir Entre';

  @override
  String get selectAtLeastOne => 'Selecione pelo menos uma pessoa';

  @override
  String get save => 'Salvar';

  @override
  String get saveExpense => 'Salvar Despesa';

  @override
  String failedToSaveExpense(String error) {
    return 'Falha ao salvar despesa: $error';
  }

  @override
  String get totalExpenses => 'Total de Despesas';

  @override
  String get perPerson => 'Por Pessoa (média)';

  @override
  String get allSettled => 'Tudo acertado! Nenhum pagamento necessário.';

  @override
  String get suggestedSettlements => 'Acertos Sugeridos';

  @override
  String get pays => 'paga';

  @override
  String get balances => 'Saldos';

  @override
  String owes(String amount) {
    return 'deve $amount';
  }

  @override
  String getsBack(String amount) {
    return 'recebe $amount';
  }

  @override
  String get settledUp => 'acertado';

  @override
  String get shareTripLink => 'Compartilhar Código';

  @override
  String get shareVia => 'Compartilhar via...';

  @override
  String joinTripMessage(String title) {
    return 'Entre na minha viagem \"$title\" no Evenly! Use o código: ';
  }

  @override
  String get tripSettings => 'Configurações da Viagem';

  @override
  String get editTripName => 'Editar Nome';

  @override
  String get deleteTrip => 'Excluir Viagem';

  @override
  String deleteTripConfirm(String title) {
    return 'Excluir \"$title\"? Esta ação não pode ser desfeita.';
  }

  @override
  String get tripDeleted => 'Viagem excluída';

  @override
  String get profile => 'Perfil';

  @override
  String get displayName => 'Nome de Exibição';

  @override
  String get yourDisplayName => 'Seu nome de exibição';

  @override
  String get updateProfile => 'Atualizar Perfil';

  @override
  String get profileUpdated => 'Perfil atualizado!';

  @override
  String get failedToUpdateProfile => 'Falha ao atualizar perfil';

  @override
  String get close => 'Fechar';

  @override
  String get ok => 'OK';

  @override
  String get error => 'Erro';

  @override
  String get loading => 'Carregando...';

  @override
  String get unknown => 'Desconhecido';

  @override
  String get editExpense => 'Editar Despesa';

  @override
  String get updateExpense => 'Atualizar Despesa';

  @override
  String get expenseUpdated => 'Despesa atualizada';

  @override
  String get expenseAdded => 'Despesa adicionada';

  @override
  String get expenseDeleted => 'Despesa excluída';

  @override
  String get deleteExpenseQuestion => 'Excluir Despesa?';

  @override
  String get deleteExpenseWarning =>
      'Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.';

  @override
  String get saving => 'Salvando...';

  @override
  String get selectAll => 'Selecionar Todos';

  @override
  String get deselectAll => 'Desmarcar Todos';

  @override
  String get splitBetweenLabel => 'Dividir entre';

  @override
  String get eachPersonPays => 'Cada pessoa paga:';

  @override
  String get balanceSummary => 'Resumo de Saldos';

  @override
  String get totalSpent => 'Total Gasto';

  @override
  String expensesCountStat(int count) {
    return '$count despesas';
  }

  @override
  String membersCountStat(int count) {
    return '$count membros';
  }

  @override
  String get individualBalances => 'Saldos Individuais';

  @override
  String get getsBackLabel => 'Recebe';

  @override
  String get owesLabel => 'Deve';

  @override
  String get settled => 'Acertado';

  @override
  String get dataNotReady => 'Dados ainda não estão prontos';

  @override
  String failedToExportPdf(String error) {
    return 'Falha ao exportar PDF: $error';
  }

  @override
  String get tripNotFound => 'Viagem não encontrada';
}
